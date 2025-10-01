-- Create system_logs table for login/logout sessions and user activity tracking
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL, -- 'login', 'logout', 'session_start', 'session_end', etc.
  entity_type text NOT NULL, -- 'user_session', 'authentication', 'system', etc.
  entity_id uuid,
  old_data jsonb, -- Previous session data
  new_data jsonb, -- New session data
  ip_address text,
  user_agent text,
  session_duration_minutes integer, -- Duration of session in minutes
  session_start_time timestamptz, -- When session started
  session_end_time timestamptz, -- When session ended
  created_at timestamptz DEFAULT now()
);

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

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON public.system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_action ON public.system_logs(action);
CREATE INDEX IF NOT EXISTS idx_system_logs_session_times ON public.system_logs(session_start_time, session_end_time);
