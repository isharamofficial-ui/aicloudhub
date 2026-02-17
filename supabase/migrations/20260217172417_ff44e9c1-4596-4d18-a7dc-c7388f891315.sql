
-- Secure atomic package purchase function
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
  _expires_at timestamptz;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get package
  SELECT * INTO _pkg FROM public.ai_packages WHERE id = p_package_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Package not found or inactive');
  END IF;

  _price := COALESCE(_pkg.price_onetime, _pkg.price_monthly, 0);

  -- Get wallet balance
  SELECT balance INTO _bal FROM public.wallets WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  IF _bal < _price THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Calculate expiry
  IF _pkg.duration_days IS NOT NULL THEN
    _expires_at := now() + (_pkg.duration_days || ' days')::interval;
  END IF;

  -- Deduct balance
  UPDATE public.wallets SET balance = balance - _price, updated_at = now() WHERE user_id = _user_id;

  -- Create user package
  INSERT INTO public.user_packages (user_id, package_id, price_paid, expires_at)
  VALUES (_user_id, p_package_id, _price, _expires_at);

  -- Create transaction
  INSERT INTO public.transactions (user_id, type, amount, status, description)
  VALUES (_user_id, 'purchase', _price, 'approved', 'Purchased ' || _pkg.name);

  -- Create user notification
  INSERT INTO public.notifications (user_id, type, title, description)
  VALUES (_user_id, 'money', 'Package Purchased',
    'You successfully purchased ' || _pkg.name || ' for Rs ' || _price::text || '. Daily income will be added automatically.');

  -- Alert admin about the purchase
  INSERT INTO public.admin_alerts (alert_type, severity, title, description, related_user_ids)
  VALUES ('package_purchase', 'info', 'Package Purchased',
    'User purchased ' || _pkg.name || ' for Rs ' || _price::text || '. Balance before: Rs ' || _bal::text || ', after: Rs ' || (_bal - _price)::text,
    ARRAY[_user_id]);

  RETURN jsonb_build_object('success', true, 'price', _price, 'package_name', _pkg.name);
END;
$$;
