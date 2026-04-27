/*
  Global member-portal flags controlled by super_admin from User Privileges Management.
  Row id = 1 is the singleton configuration.
*/

CREATE TABLE IF NOT EXISTS public.member_portal_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  show_offerings_on_dashboard boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.member_portal_settings (id, show_offerings_on_dashboard)
VALUES (1, true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.member_portal_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone signed in can read member portal settings" ON public.member_portal_settings;
CREATE POLICY "Anyone signed in can read member portal settings"
  ON public.member_portal_settings
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Super admins can update member portal settings" ON public.member_portal_settings;
CREATE POLICY "Super admins can update member portal settings"
  ON public.member_portal_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.system_users su
      WHERE su.user_id = auth.uid()
        AND su.role = 'super_admin'
        AND su.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.system_users su
      WHERE su.user_id = auth.uid()
        AND su.role = 'super_admin'
        AND su.is_active = true
    )
  );

GRANT SELECT ON TABLE public.member_portal_settings TO authenticated;
GRANT UPDATE ON TABLE public.member_portal_settings TO authenticated;
