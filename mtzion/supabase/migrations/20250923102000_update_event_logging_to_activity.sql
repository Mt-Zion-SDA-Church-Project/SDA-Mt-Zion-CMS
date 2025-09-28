/* Update event logging trigger function to write into activity_logs */

CREATE OR REPLACE FUNCTION public.log_event_change()
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
    v_entity_id := NEW.id;
    v_new := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_entity_id := NEW.id;
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_entity_id := OLD.id;
    v_old := to_jsonb(OLD);
  END IF;

  INSERT INTO public.activity_logs (user_id, action, entity_type, entity_id, old_data, new_data, ip_address, user_agent)
  VALUES (v_user, v_action, 'events', v_entity_id, v_old, v_new, null, null);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;










