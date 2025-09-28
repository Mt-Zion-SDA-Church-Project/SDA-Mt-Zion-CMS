/* Generic activity logging for multiple tables into activity_logs */

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

-- Attach to important tables
DROP TRIGGER IF EXISTS trg_events_activity ON public.events;
CREATE TRIGGER trg_events_activity
AFTER INSERT OR UPDATE OR DELETE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.log_change_generic();

DROP TRIGGER IF EXISTS trg_visitors_activity ON public.visitors;
CREATE TRIGGER trg_visitors_activity
AFTER INSERT OR UPDATE OR DELETE ON public.visitors
FOR EACH ROW EXECUTE FUNCTION public.log_change_generic();

DROP TRIGGER IF EXISTS trg_system_users_activity ON public.system_users;
CREATE TRIGGER trg_system_users_activity
AFTER INSERT OR UPDATE OR DELETE ON public.system_users
FOR EACH ROW EXECUTE FUNCTION public.log_change_generic();










