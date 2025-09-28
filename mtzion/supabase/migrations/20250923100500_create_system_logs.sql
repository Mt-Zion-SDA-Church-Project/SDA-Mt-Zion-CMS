/*
  Create system_logs table used by Activity Log
  Idempotent: uses IF NOT EXISTS and ALTERs to add missing columns
*/

CREATE TABLE IF NOT EXISTS public.system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Ensure columns exist (for older environments)
ALTER TABLE public.system_logs
  ADD COLUMN IF NOT EXISTS old_data jsonb,
  ADD COLUMN IF NOT EXISTS new_data jsonb,
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS user_agent text;

-- Enable RLS and policies
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read system logs" ON public.system_logs;
CREATE POLICY "Admins can read system logs" ON public.system_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.system_users su
      WHERE su.user_id = auth.uid()
        AND su.role IN ('admin','super_admin')
        AND su.is_active = true
    )
  );

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON public.system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_entity ON public.system_logs(entity_type, entity_id);



