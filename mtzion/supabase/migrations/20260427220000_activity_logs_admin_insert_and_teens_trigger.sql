/*
  Audit rows for children and events (and every other table wired to log_change_generic) INSERT into
  activity_logs from the same trigger function.

  If activity_logs has RLS with SELECT-only policies, INSERT from the trigger can still be blocked
  for the session role in some setups. The GRANT + admin INSERT policy + function settings below fix
  that for all entity types, not only teens.

  Re-attach triggers on public.teens and public.events so those two flows are definitely covered if
  an older bulk migration was skipped or partially applied.
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
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['teens', 'events']
  LOOP
    IF to_regclass(format('public.%I', tbl)) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_activity ON public.%I', tbl, tbl);
      EXECUTE format(
        'CREATE TRIGGER trg_%I_activity
         AFTER INSERT OR UPDATE OR DELETE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.log_change_generic()',
        tbl,
        tbl
      );
    END IF;
  END LOOP;
END $$;
