/*
  Child rows live in public.teens; audit rows come from trg_teens_activity -> log_change_generic().

  If activity_logs has RLS enabled with SELECT-only policies, INSERT from the trigger can still be
  evaluated for the session role in some setups. Allow admins to INSERT audit rows (same rule as
  SELECT), and ensure the teens trigger exists.

  Also set search_path / row_security on the logger so inserts are reliable when owned by postgres.
*/

ALTER FUNCTION public.log_change_generic() SET search_path = public;

DO $cfg$
BEGIN
  EXECUTE 'ALTER FUNCTION public.log_change_generic() SET row_security = off';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'log_change_generic: could not SET row_security (owner may lack privilege)';
  WHEN OTHERS THEN
    RAISE NOTICE 'log_change_generic: ALTER FUNCTION SET row_security skipped: %', SQLERRM;
END;
$cfg$;

GRANT INSERT ON TABLE public.activity_logs TO authenticated;

DROP POLICY IF EXISTS "Admins can insert activity logs" ON public.activity_logs;
CREATE POLICY "Admins can insert activity logs" ON public.activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.system_users su
      WHERE su.user_id = auth.uid()
        AND su.role IN ('admin','super_admin')
        AND su.is_active = true
    )
  );

DO $$
BEGIN
  IF to_regclass('public.teens') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_teens_activity ON public.teens';
    EXECUTE $t$
      CREATE TRIGGER trg_teens_activity
      AFTER INSERT OR UPDATE OR DELETE ON public.teens
      FOR EACH ROW EXECUTE FUNCTION public.log_change_generic()
    $t$;
  END IF;
END $$;
