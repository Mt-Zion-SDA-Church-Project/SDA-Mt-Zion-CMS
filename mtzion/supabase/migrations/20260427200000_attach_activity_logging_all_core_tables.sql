/*
  Expand activity logging to all core business tables.
  This keeps an audit trail for members, visitors, children (teens), events, attendance,
  givings, and other admin-managed data.
*/

-- Ensure generic logger exists (idempotent)
CREATE OR REPLACE FUNCTION public.log_change_generic()
RETURNS TRIGGER AS $$
DECLARE
  v_user uuid;
  v_action text;
  v_entity_id uuid;
  v_old jsonb;
  v_new jsonb;
BEGIN
  v_user := auth.uid();

  IF TG_OP = 'INSERT' THEN
    v_action := 'insert';
    v_entity_id := COALESCE(NEW.id, NEW.user_id);
    v_new := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_entity_id := COALESCE(NEW.id, NEW.user_id);
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_entity_id := COALESCE(OLD.id, OLD.user_id);
    v_old := to_jsonb(OLD);
  END IF;

  INSERT INTO public.activity_logs (user_id, action, entity_type, entity_id, old_data, new_data, ip_address, user_agent)
  VALUES (v_user, v_action, TG_TABLE_NAME, v_entity_id, v_old, v_new, null, null);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'families',
    'ministries',
    'members',
    'member_ministries',
    'visitors',
    'events',
    'attendance',
    'tithes',
    'offerings',
    'sabbath_schools',
    'teens',
    'system_users',
    'sabbath_resources',
    'offertory_categories',
    'offertory_payments',
    'cash_offering_accounts',
    'galleries',
    'gallery_photos',
    'notifications',
    'user_login_sessions'
  ]
  LOOP
    IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_activity ON public.%I', t, t);
      EXECUTE format(
        'CREATE TRIGGER trg_%I_activity
         AFTER INSERT OR UPDATE OR DELETE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.log_change_generic()',
        t,
        t
      );
    END IF;
  END LOOP;
END $$;
