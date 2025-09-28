/* Attach generic activity logging to members table */

-- Ensure the generic function exists (no-op if already created)
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

DROP TRIGGER IF EXISTS trg_members_activity ON public.members;
CREATE TRIGGER trg_members_activity
AFTER INSERT OR UPDATE OR DELETE ON public.members
FOR EACH ROW EXECUTE FUNCTION public.log_change_generic();








