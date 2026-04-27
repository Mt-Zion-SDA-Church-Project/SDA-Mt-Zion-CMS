/*
  Per-user sign-in / sign-out sessions for the admin "User log" view.
  Not the same as public.system_logs (event/config audit).
*/

CREATE TABLE IF NOT EXISTS public.user_login_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer,
  user_agent text
);

CREATE INDEX IF NOT EXISTS idx_user_login_sessions_user_id ON public.user_login_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_login_sessions_started_at ON public.user_login_sessions (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_login_sessions_open ON public.user_login_sessions (user_id) WHERE ended_at IS NULL;

ALTER TABLE public.user_login_sessions ENABLE ROW LEVEL SECURITY;

-- Users can insert their own session row on sign-in
DROP POLICY IF EXISTS "Users insert own login session" ON public.user_login_sessions;
CREATE POLICY "Users insert own login session" ON public.user_login_sessions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own session to close it (sign-out)
DROP POLICY IF EXISTS "Users update own open session" ON public.user_login_sessions;
CREATE POLICY "Users update own open session" ON public.user_login_sessions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can read all (for User log page)
DROP POLICY IF EXISTS "Admins read all login sessions" ON public.user_login_sessions;
CREATE POLICY "Admins read all login sessions" ON public.user_login_sessions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.system_users su
      WHERE su.user_id = auth.uid()
        AND su.role IN ('admin', 'super_admin')
        AND su.is_active = true
    )
  );

COMMENT ON TABLE public.user_login_sessions IS 'Web app sign-in sessions: start at SIGNED_IN, end at SIGNED_OUT.';
