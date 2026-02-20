CREATE POLICY "Admins can delete device logs"
ON public.device_logs
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));