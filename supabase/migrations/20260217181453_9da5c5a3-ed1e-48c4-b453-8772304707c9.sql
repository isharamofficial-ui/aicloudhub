
-- 1. Atomic deposit approval RPC
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

  -- Verify admin
  IF NOT public.has_role(_caller_id, 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Forbidden');
  END IF;

  -- Get deposit
  SELECT * INTO _dep FROM public.deposit_requests WHERE id = p_deposit_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deposit not found');
  END IF;
  IF _dep.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deposit already processed');
  END IF;

  -- Get user display name
  SELECT display_name INTO _display_name FROM public.profiles WHERE user_id = _dep.user_id;

  -- Lock wallet and get balance
  SELECT balance INTO _bal FROM public.wallets WHERE user_id = _dep.user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  -- Update deposit status
  UPDATE public.deposit_requests SET status = 'approved', updated_at = now() WHERE id = p_deposit_id;

  -- Credit wallet
  UPDATE public.wallets SET balance = balance + _dep.amount, total_deposited = total_deposited + _dep.amount, updated_at = now() WHERE user_id = _dep.user_id;

  -- Verify balance
  SELECT balance INTO _new_bal FROM public.wallets WHERE user_id = _dep.user_id;

  -- Update/insert transaction
  UPDATE public.transactions SET status = 'approved', description = 'Deposit approved by admin'
    WHERE user_id = _dep.user_id AND type = 'deposit' AND status = 'pending' AND reference_id = p_deposit_id;
  IF NOT FOUND THEN
    INSERT INTO public.transactions (user_id, type, amount, status, description, reference_id)
    VALUES (_dep.user_id, 'deposit', _dep.amount, 'approved', 'Deposit approved by admin', p_deposit_id);
  END IF;

  -- Notify user
  INSERT INTO public.notifications (user_id, type, title, description)
  VALUES (_dep.user_id, 'money', 'Deposit Approved ✅',
    'Your deposit of Rs ' || _dep.amount::text || ' has been approved and credited to your wallet.');

  -- Integrity check
  IF abs(_new_bal - (_bal + _dep.amount)) > 0.01 THEN
    INSERT INTO public.admin_alerts (alert_type, severity, title, description, related_user_ids)
    VALUES ('integrity_error', 'critical', '⚠️ Balance Mismatch on Deposit Approval',
      'Deposit Rs ' || _dep.amount::text || ' for ' || COALESCE(_display_name, 'User') || '. Expected: Rs ' || (_bal + _dep.amount)::text || ', Actual: Rs ' || _new_bal::text,
      ARRAY[_dep.user_id]);
  END IF;

  -- Distribute referral commissions
  DECLARE
    _rates jsonb;
    _ref record;
    _rate numeric;
    _comm_amount numeric;
    _r_bal numeric;
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
        _comm_amount := (_dep.amount * _rate) / 100;

        INSERT INTO public.commissions (user_id, amount, tier, from_user_id, source_type, source_id)
        VALUES (_ref.referrer_id, _comm_amount, _ref.tier, _dep.user_id, 'deposit', p_deposit_id);

        UPDATE public.wallets SET balance = balance + _comm_amount, total_commission = total_commission + _comm_amount, updated_at = now()
        WHERE user_id = _ref.referrer_id;

        INSERT INTO public.transactions (user_id, type, amount, status, description, reference_id)
        VALUES (_ref.referrer_id, 'commission', _comm_amount, 'approved', 'Tier ' || _ref.tier || ' commission from deposit', p_deposit_id);

        INSERT INTO public.notifications (user_id, type, title, description)
        VALUES (_ref.referrer_id, 'money', 'Commission Earned 🎉',
          'You earned Rs ' || _comm_amount::text || ' (Tier ' || _ref.tier || ') from a team member''s deposit.');
      END LOOP;
    END IF;
  END;

  RETURN jsonb_build_object('success', true, 'amount', _dep.amount, 'user_id', _dep.user_id, 'balance_before', _bal, 'balance_after', _new_bal);
END;
$$;

-- 2. Add ban_count to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ban_count integer NOT NULL DEFAULT 0;

-- 3. Add privacy_accepted to profiles  
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS privacy_accepted boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS privacy_accepted_at timestamp with time zone;
