
-- =============================================
-- 1. Ban user with credit score cascade to team
-- =============================================
CREATE OR REPLACE FUNCTION public.ban_user(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _caller_id uuid;
  _user record;
  _new_ban_count integer;
  _self_penalty integer;
  _new_credit integer;
  _team_penalty_pct numeric;
  _team_penalty integer;
  _ref record;
  _member record;
  _member_new_credit integer;
BEGIN
  _caller_id := auth.uid();
  IF NOT public.has_role(_caller_id, 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Forbidden');
  END IF;

  SELECT * INTO _user FROM public.profiles WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  IF _user.is_frozen THEN
    RETURN jsonb_build_object('success', false, 'error', 'User already banned');
  END IF;

  _new_ban_count := _user.ban_count + 1;

  -- Self penalty: 20% per ban (escalating)
  _self_penalty := LEAST(_new_ban_count * 20, _user.credit_score);
  _new_credit := GREATEST(0, _user.credit_score - _self_penalty);

  -- Freeze and update credit score
  UPDATE public.profiles 
  SET is_frozen = true, ban_count = _new_ban_count, credit_score = _new_credit 
  WHERE user_id = p_user_id;

  -- Notify banned user
  INSERT INTO public.notifications (user_id, type, title, description)
  VALUES (p_user_id, 'security', 'Account Frozen 🔒',
    'Your account has been frozen (Ban #' || _new_ban_count || '). Credit score decreased to ' || _new_credit || '%. Withdrawals are disabled.');

  -- Team impact: ban_count * 3% for tier 1, ban_count * 2% for tier 2, ban_count * 1% for tier 3
  FOR _ref IN 
    SELECT referrer_id, tier FROM public.referrals WHERE referred_id = p_user_id
  LOOP
    _team_penalty_pct := _new_ban_count * (CASE _ref.tier WHEN 1 THEN 3 WHEN 2 THEN 2 WHEN 3 THEN 1 ELSE 0 END);
    
    SELECT * INTO _member FROM public.profiles WHERE user_id = _ref.referrer_id;
    IF FOUND AND _team_penalty_pct > 0 THEN
      _team_penalty := LEAST(CEIL(_member.credit_score * _team_penalty_pct / 100), _member.credit_score);
      _member_new_credit := GREATEST(0, _member.credit_score - _team_penalty);

      UPDATE public.profiles SET credit_score = _member_new_credit WHERE user_id = _ref.referrer_id;

      INSERT INTO public.notifications (user_id, type, title, description)
      VALUES (_ref.referrer_id, 'security', 'Credit Score Decreased ⚠️',
        'Your credit score decreased by ' || _team_penalty || '% (now ' || _member_new_credit || '%) because a Tier ' || _ref.tier || ' team member (' || COALESCE(_user.display_name, 'Unknown') || ') was banned. Credit score affects your commissions, fees, and daily rewards.');
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'ban_count', _new_ban_count, 'new_credit_score', _new_credit);
END;
$$;

-- =============================================
-- 2. Update daily_checkin to factor credit score
-- =============================================
CREATE OR REPLACE FUNCTION public.daily_checkin()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid;
  _today date;
  _base_reward numeric := 10;
  _credit_score integer;
  _actual_reward numeric;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  _today := CURRENT_DATE;

  IF EXISTS (SELECT 1 FROM public.daily_signins WHERE user_id = _user_id AND signed_in_date = _today) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already signed in today');
  END IF;

  SELECT credit_score INTO _credit_score FROM public.profiles WHERE user_id = _user_id;
  _credit_score := COALESCE(_credit_score, 100);

  -- Reward scaled by credit score
  _actual_reward := ROUND((_base_reward * _credit_score / 100)::numeric, 2);
  IF _actual_reward < 1 THEN _actual_reward := 1; END IF;

  INSERT INTO public.daily_signins (user_id, signed_in_date, reward_amount)
  VALUES (_user_id, _today, _actual_reward);

  UPDATE public.wallets SET balance = balance + _actual_reward, updated_at = now() WHERE user_id = _user_id;

  INSERT INTO public.notifications (user_id, type, title, description)
  VALUES (_user_id, 'money', 'Daily Sign-In Reward',
    'You received Rs ' || _actual_reward::text || ' for your daily check-in.' ||
    CASE WHEN _credit_score < 100 THEN ' (Reduced due to ' || _credit_score || '% credit score)' ELSE '' END);

  RETURN jsonb_build_object('success', true, 'reward', _actual_reward, 'credit_score', _credit_score);
END;
$$;

-- =============================================
-- 3. Update submit_withdrawal: handling fee increases with low credit score
--    Base 5% + (100 - credit_score) * 0.1%
-- =============================================
CREATE OR REPLACE FUNCTION public.submit_withdrawal(p_amount numeric, p_bank_account_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid;
  _bal numeric;
  _new_bal numeric;
  _is_frozen boolean;
  _has_pkg boolean;
  _credit_score integer;
  _fee_pct numeric;
  _fee numeric;
  _net numeric;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT is_frozen, credit_score INTO _is_frozen, _credit_score FROM public.profiles WHERE user_id = _user_id;
  IF _is_frozen THEN
    RETURN jsonb_build_object('success', false, 'error', 'Account is frozen');
  END IF;
  _credit_score := COALESCE(_credit_score, 100);

  SELECT EXISTS(SELECT 1 FROM public.user_packages WHERE user_id = _user_id AND is_active = true) INTO _has_pkg;
  IF NOT _has_pkg THEN
    RETURN jsonb_build_object('success', false, 'error', 'Active package required');
  END IF;

  IF p_amount < 1000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Minimum withdrawal is Rs 1,000');
  END IF;

  -- Fee increases with lower credit score: base 5% + penalty
  _fee_pct := 5.0 + ((100 - _credit_score) * 0.1);
  _fee := ROUND((p_amount * _fee_pct / 100)::numeric, 2);
  _net := p_amount;

  SELECT balance INTO _bal FROM public.wallets WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  IF _bal < _net THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  UPDATE public.wallets SET balance = balance - _net, updated_at = now() WHERE user_id = _user_id;
  SELECT balance INTO _new_bal FROM public.wallets WHERE user_id = _user_id;

  INSERT INTO public.withdrawal_requests (user_id, amount, bank_account_id)
  VALUES (_user_id, p_amount, p_bank_account_id);

  INSERT INTO public.transactions (user_id, type, amount, status, description)
  VALUES (_user_id, 'withdrawal', p_amount, 'pending', 
    'Withdrawal request (Fee: ' || _fee_pct || '% = Rs ' || _fee::text || ')');

  INSERT INTO public.notifications (user_id, type, title, description)
  VALUES (_user_id, 'money', 'Withdrawal Request Submitted',
    'Your withdrawal of Rs ' || p_amount::text || ' is pending. Handling fee: ' || _fee_pct || '% (Rs ' || _fee::text || ').' ||
    CASE WHEN _credit_score < 100 THEN ' Fee increased due to ' || _credit_score || '% credit score.' ELSE '' END);

  IF abs(_new_bal - (_bal - _net)) > 0.01 THEN
    INSERT INTO public.admin_alerts (alert_type, severity, title, description, related_user_ids)
    VALUES ('integrity_error', 'critical', '⚠️ Balance Mismatch on Withdrawal',
      'Expected: Rs ' || (_bal - _net)::text || ', Actual: Rs ' || _new_bal::text, ARRAY[_user_id]);
  END IF;

  RETURN jsonb_build_object('success', true, 'amount', p_amount, 'fee_pct', _fee_pct, 'fee', _fee, 'credit_score', _credit_score);
END;
$$;

-- =============================================
-- 4. Update approve_deposit: commissions scaled by credit score
-- =============================================
CREATE OR REPLACE FUNCTION public.approve_deposit(p_deposit_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _dep record;
  _bal numeric;
  _new_bal numeric;
  _caller_id uuid;
  _display_name text;
BEGIN
  _caller_id := auth.uid();
  IF _caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF NOT public.has_role(_caller_id, 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Forbidden');
  END IF;

  SELECT * INTO _dep FROM public.deposit_requests WHERE id = p_deposit_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Deposit not found'); END IF;
  IF _dep.status != 'pending' THEN RETURN jsonb_build_object('success', false, 'error', 'Already processed'); END IF;

  SELECT display_name INTO _display_name FROM public.profiles WHERE user_id = _dep.user_id;
  SELECT balance INTO _bal FROM public.wallets WHERE user_id = _dep.user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Wallet not found'); END IF;

  UPDATE public.deposit_requests SET status = 'approved', updated_at = now() WHERE id = p_deposit_id;
  UPDATE public.wallets SET balance = balance + _dep.amount, total_deposited = total_deposited + _dep.amount, updated_at = now() WHERE user_id = _dep.user_id;
  SELECT balance INTO _new_bal FROM public.wallets WHERE user_id = _dep.user_id;

  UPDATE public.transactions SET status = 'approved', description = 'Deposit approved by admin'
    WHERE user_id = _dep.user_id AND type = 'deposit' AND status = 'pending' AND reference_id = p_deposit_id;
  IF NOT FOUND THEN
    INSERT INTO public.transactions (user_id, type, amount, status, description, reference_id)
    VALUES (_dep.user_id, 'deposit', _dep.amount, 'approved', 'Deposit approved by admin', p_deposit_id);
  END IF;

  INSERT INTO public.notifications (user_id, type, title, description)
  VALUES (_dep.user_id, 'money', 'Deposit Approved ✅',
    'Your deposit of Rs ' || _dep.amount::text || ' has been approved and credited.');

  IF abs(_new_bal - (_bal + _dep.amount)) > 0.01 THEN
    INSERT INTO public.admin_alerts (alert_type, severity, title, description, related_user_ids)
    VALUES ('integrity_error', 'critical', '⚠️ Balance Mismatch on Deposit',
      'Expected: Rs ' || (_bal + _dep.amount)::text || ', Actual: Rs ' || _new_bal::text, ARRAY[_dep.user_id]);
  END IF;

  -- Distribute referral commissions scaled by earner's credit score
  DECLARE
    _rates jsonb;
    _ref record;
    _rate numeric;
    _comm_amount numeric;
    _earner_credit integer;
  BEGIN
    SELECT value INTO _rates FROM public.platform_settings WHERE key = 'commission_rates';
    IF _rates IS NOT NULL THEN
      FOR _ref IN SELECT referrer_id, tier FROM public.referrals WHERE referred_id = _dep.user_id LOOP
        _rate := CASE _ref.tier
          WHEN 1 THEN COALESCE((_rates->>'level_1')::numeric, 0)
          WHEN 2 THEN COALESCE((_rates->>'level_2')::numeric, 0)
          WHEN 3 THEN COALESCE((_rates->>'level_3')::numeric, 0)
          ELSE 0
        END;
        IF _rate <= 0 THEN CONTINUE; END IF;

        -- Scale commission by earner's credit score
        SELECT credit_score INTO _earner_credit FROM public.profiles WHERE user_id = _ref.referrer_id;
        _earner_credit := COALESCE(_earner_credit, 100);
        
        _comm_amount := ROUND((_dep.amount * _rate / 100 * _earner_credit / 100)::numeric, 2);
        IF _comm_amount < 0.01 THEN CONTINUE; END IF;

        INSERT INTO public.commissions (user_id, amount, tier, from_user_id, source_type, source_id)
        VALUES (_ref.referrer_id, _comm_amount, _ref.tier, _dep.user_id, 'deposit', p_deposit_id);

        UPDATE public.wallets SET balance = balance + _comm_amount, total_commission = total_commission + _comm_amount, updated_at = now()
        WHERE user_id = _ref.referrer_id;

        INSERT INTO public.transactions (user_id, type, amount, status, description, reference_id)
        VALUES (_ref.referrer_id, 'commission', _comm_amount, 'approved', 
          'Tier ' || _ref.tier || ' commission' || CASE WHEN _earner_credit < 100 THEN ' (Credit: ' || _earner_credit || '%)' ELSE '' END, p_deposit_id);

        INSERT INTO public.notifications (user_id, type, title, description)
        VALUES (_ref.referrer_id, 'money', 'Commission Earned 🎉',
          'You earned Rs ' || _comm_amount::text || ' (Tier ' || _ref.tier || ')' ||
          CASE WHEN _earner_credit < 100 THEN '. Reduced due to ' || _earner_credit || '% credit score.' ELSE '' END);
      END LOOP;
    END IF;
  END;

  RETURN jsonb_build_object('success', true, 'amount', _dep.amount, 'user_id', _dep.user_id);
END;
$$;
