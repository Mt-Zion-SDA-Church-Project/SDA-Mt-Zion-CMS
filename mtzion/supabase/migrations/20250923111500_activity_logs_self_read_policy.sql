/* Allow users to read their own activity logs in addition to admins */

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own activity logs" ON public.activity_logs;
CREATE POLICY "Users can read own activity logs" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());








