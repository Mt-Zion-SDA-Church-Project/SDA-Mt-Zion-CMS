/*
  Ensure admins/super_admins can manage system_users and everyone authenticated can read basic fields
*/

ALTER TABLE public.system_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage system users" ON public.system_users;
CREATE POLICY "Admins manage system users" ON public.system_users
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.system_users su
      WHERE su.user_id = auth.uid()
        AND su.role IN ('admin','super_admin')
        AND su.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.system_users su
      WHERE su.user_id = auth.uid()
        AND su.role IN ('admin','super_admin')
        AND su.is_active = true
    )
  );

DROP POLICY IF EXISTS "Authenticated can read system users" ON public.system_users;
CREATE POLICY "Authenticated can read system users" ON public.system_users
  FOR SELECT TO authenticated
  USING (true);










