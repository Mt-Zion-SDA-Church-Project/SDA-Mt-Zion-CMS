/*
  Event change logging into system_logs
*/

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

  INSERT INTO public.system_logs (user_id, action, entity_type, entity_id, old_data, new_data, ip_address, user_agent)
  VALUES (v_user, v_action, 'events', v_entity_id, v_old, v_new, null, null);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_events_log_insert ON public.events;
CREATE TRIGGER trg_events_log_insert
AFTER INSERT ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.log_event_change();

DROP TRIGGER IF EXISTS trg_events_log_update ON public.events;
CREATE TRIGGER trg_events_log_update
AFTER UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.log_event_change();

DROP TRIGGER IF EXISTS trg_events_log_delete ON public.events;
CREATE TRIGGER trg_events_log_delete
AFTER DELETE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.log_event_change();

-- RLS: allow admins/super_admins to read system_logs
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










