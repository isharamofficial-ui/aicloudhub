
-- Create atomic withdrawal RPC that handles balance deduction securely
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
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check frozen
  SELECT is_frozen INTO _is_frozen FROM public.profiles WHERE user_id = _user_id;
  IF _is_frozen THEN
    RETURN jsonb_build_object('success', false, 'error', 'Account is frozen');
  END IF;

  -- Check active package
  SELECT EXISTS(SELECT 1 FROM public.user_packages WHERE user_id = _user_id AND is_active = true) INTO _has_pkg;
  IF NOT _has_pkg THEN
    RETURN jsonb_build_object('success', false, 'error', 'Active package required');
  END IF;

  IF p_amount < 1000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Minimum withdrawal is Rs 1,000');
  END IF;

  -- Lock wallet row and check balance
  SELECT balance INTO _bal FROM public.wallets WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  IF _bal < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Deduct balance
  UPDATE public.wallets SET balance = balance - p_amount, updated_at = now() WHERE user_id = _user_id;

  -- Verify deduction
  SELECT balance INTO _new_bal FROM public.wallets WHERE user_id = _user_id;

  -- Create withdrawal request
  INSERT INTO public.withdrawal_requests (user_id, amount, bank_account_id)
  VALUES (_user_id, p_amount, p_bank_account_id);

  -- Create transaction record
  INSERT INTO public.transactions (user_id, type, amount, status, description)
  VALUES (_user_id, 'withdrawal', p_amount, 'pending', 'Withdrawal request');

  -- Create notification
  INSERT INTO public.notifications (user_id, type, title, description)
  VALUES (_user_id, 'money', 'Withdrawal Request Submitted',
    'Your withdrawal of Rs ' || p_amount::text || ' is pending admin approval.');

  -- Integrity check
  IF abs(_new_bal - (_bal - p_amount)) > 0.01 THEN
    INSERT INTO public.admin_alerts (alert_type, severity, title, description, related_user_ids)
    VALUES ('integrity_error', 'critical', '⚠️ Balance Mismatch on Withdrawal',
      'User withdrew Rs ' || p_amount::text || '. Expected: Rs ' || (_bal - p_amount)::text || ', Actual: Rs ' || _new_bal::text,
      ARRAY[_user_id]);
  END IF;

  RETURN jsonb_build_object('success', true, 'amount', p_amount);
END;
$$;

-- Also update purchase_package to only alert on integrity errors (remove normal purchase alert)
CREATE OR REPLACE FUNCTION public.purchase_package(p_package_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid;
  _pkg record;
  _price numeric;
  _bal numeric;
  _new_bal numeric;
  _expires_at timestamptz;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO _pkg FROM public.ai_packages WHERE id = p_package_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Package not found or inactive');
  END IF;

  _price := COALESCE(_pkg.price_onetime, _pkg.price_monthly, 0);

  SELECT balance INTO _bal FROM public.wallets WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  IF _bal < _price THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  IF _pkg.duration_days IS NOT NULL THEN
    _expires_at := now() + (_pkg.duration_days || ' days')::interval;
  END IF;

  UPDATE public.wallets SET balance = balance - _price, updated_at = now() WHERE user_id = _user_id;

  SELECT balance INTO _new_bal FROM public.wallets WHERE user_id = _user_id;

  INSERT INTO public.user_packages (user_id, package_id, price_paid, expires_at)
  VALUES (_user_id, p_package_id, _price, _expires_at);

  INSERT INTO public.transactions (user_id, type, amount, status, description)
  VALUES (_user_id, 'purchase', _price, 'approved', 'Purchased ' || _pkg.name);

  INSERT INTO public.notifications (user_id, type, title, description)
  VALUES (_user_id, 'money', 'Package Purchased',
    'You successfully purchased ' || _pkg.name || ' for Rs ' || _price::text || '.');

  -- ONLY alert admin if integrity error detected
  IF abs(_new_bal - (_bal - _price)) > 0.01 THEN
    INSERT INTO public.admin_alerts (alert_type, severity, title, description, related_user_ids)
    VALUES ('integrity_error', 'critical', '⚠️ Balance Mismatch on Purchase',
      'User purchased ' || _pkg.name || ' for Rs ' || _price::text || '. Expected: Rs ' || (_bal - _price)::text || ', Actual: Rs ' || _new_bal::text,
      ARRAY[_user_id]);
  END IF;

  RETURN jsonb_build_object('success', true, 'price', _price, 'package_name', _pkg.name);
END;
$$;

-- Enable realtime for admin_alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_alerts;
