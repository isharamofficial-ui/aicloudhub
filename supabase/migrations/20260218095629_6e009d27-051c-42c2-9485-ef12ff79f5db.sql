
CREATE OR REPLACE FUNCTION public.admin_reset_all_data()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _caller_id uuid;
BEGIN
  _caller_id := auth.uid();
  IF NOT public.has_role(_caller_id, 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Forbidden');
  END IF;

  -- Delete all transactional / activity data first (non-admin users only where applicable)
  DELETE FROM public.transactions WHERE user_id != _caller_id OR true;
  DELETE FROM public.commissions WHERE user_id != _caller_id OR true;
  DELETE FROM public.daily_signins WHERE user_id != _caller_id OR true;
  DELETE FROM public.device_logs WHERE user_id != _caller_id OR true;
  DELETE FROM public.notifications WHERE user_id != _caller_id OR true;
  DELETE FROM public.redeem_code_uses WHERE user_id != _caller_id OR true;
  DELETE FROM public.referrals WHERE referrer_id != _caller_id OR true;
  DELETE FROM public.user_packages WHERE user_id != _caller_id OR true;
  DELETE FROM public.withdrawal_requests WHERE user_id != _caller_id OR true;
  DELETE FROM public.deposit_requests WHERE user_id != _caller_id OR true;
  DELETE FROM public.bank_accounts WHERE user_id != _caller_id OR true;
  DELETE FROM public.wallets WHERE user_id != _caller_id OR true;
  DELETE FROM public.admin_alerts WHERE id IS NOT NULL;

  -- Delete user roles for non-admin users only (keep current admin session alive)
  DELETE FROM public.user_roles WHERE user_id != _caller_id;

  -- Delete profiles for non-admin users only
  DELETE FROM public.profiles WHERE user_id != _caller_id;

  -- Re-create admin wallet so their account stays functional
  INSERT INTO public.wallets (user_id)
  VALUES (_caller_id)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('success', true, 'message', 'All user data has been deleted. Admin account preserved.');
END;
$function$;
