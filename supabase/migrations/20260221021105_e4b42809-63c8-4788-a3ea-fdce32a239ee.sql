-- Function to auto-deactivate expired packages
CREATE OR REPLACE FUNCTION public.deactivate_expired_packages()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _deactivated integer := 0;
BEGIN
  UPDATE public.user_packages
  SET is_active = false
  WHERE is_active = true
    AND expires_at IS NOT NULL
    AND expires_at <= now();
  
  GET DIAGNOSTICS _deactivated = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'deactivated_count', _deactivated,
    'run_at', now()
  );
END;
$function$;
