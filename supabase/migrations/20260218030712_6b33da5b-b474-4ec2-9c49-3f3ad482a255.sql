
-- Allow admins to delete user_packages
CREATE POLICY "Admins can delete user_packages"
ON public.user_packages
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
