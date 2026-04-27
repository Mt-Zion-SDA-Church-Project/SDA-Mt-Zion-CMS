/*
  Fix: log_change_generic used COALESCE(NEW.id, NEW.user_id) which errors on tables
  without user_id (e.g. visitors) because PL/pgSQL still resolves NEW.user_id.

  Derive entity_id from to_jsonb(NEW/OLD) so only present keys are read.
*/

CREATE OR REPLACE FUNCTION public.log_change_generic()
RETURNS TRIGGER AS $$
DECLARE
  v_user uuid;
  v_action text;
  v_entity_id uuid;
  v_old jsonb;
  v_new jsonb;
  jb jsonb;
BEGIN
  v_user := auth.uid();

  IF TG_OP = 'INSERT' THEN
    v_action := 'insert';
    jb := to_jsonb(NEW);
    v_entity_id := NULL;
    IF jb ? 'id' AND jb->>'id' IS NOT NULL THEN
      v_entity_id := (jb->>'id')::uuid;
    ELSIF jb ? 'user_id' AND jb->>'user_id' IS NOT NULL THEN
      v_entity_id := (jb->>'user_id')::uuid;
    END IF;
    v_new := jb;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    jb := to_jsonb(NEW);
    v_entity_id := NULL;
    IF jb ? 'id' AND jb->>'id' IS NOT NULL THEN
      v_entity_id := (jb->>'id')::uuid;
    ELSIF jb ? 'user_id' AND jb->>'user_id' IS NOT NULL THEN
      v_entity_id := (jb->>'user_id')::uuid;
    END IF;
    v_old := to_jsonb(OLD);
    v_new := jb;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    jb := to_jsonb(OLD);
    v_entity_id := NULL;
    IF jb ? 'id' AND jb->>'id' IS NOT NULL THEN
      v_entity_id := (jb->>'id')::uuid;
    ELSIF jb ? 'user_id' AND jb->>'user_id' IS NOT NULL THEN
      v_entity_id := (jb->>'user_id')::uuid;
    END IF;
    v_old := jb;
  END IF;

  INSERT INTO public.activity_logs (user_id, action, entity_type, entity_id, old_data, new_data, ip_address, user_agent)
  VALUES (v_user, v_action, TG_TABLE_NAME, v_entity_id, v_old, v_new, null, null);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
