/*
  Sync system_users.is_active with auth.users.banned_until to block sign-in
  - When is_active = false -> set banned_until to 'infinity' (blocked)
  - When is_active = true  -> set banned_until to NULL (unblocked)
*/

CREATE OR REPLACE FUNCTION public.sync_banned_with_is_active()
RETURNS TRIGGER AS $$
DECLARE
  target_user uuid;
  should_block boolean;
BEGIN
  target_user := COALESCE(NEW.user_id, OLD.user_id);
  IF target_user IS NULL THEN
    RETURN NEW; -- nothing to sync if not linked to auth.users
  END IF;

  should_block := (CASE WHEN TG_OP = 'DELETE' THEN true ELSE (NOT COALESCE(NEW.is_active, true)) END);

  IF should_block THEN
    UPDATE auth.users SET banned_until = 'infinity' WHERE id = target_user;
  ELSE
    UPDATE auth.users SET banned_until = NULL WHERE id = target_user;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach triggers
DROP TRIGGER IF EXISTS trg_system_users_sync_ban_ins ON public.system_users;
CREATE TRIGGER trg_system_users_sync_ban_ins
AFTER INSERT ON public.system_users
FOR EACH ROW EXECUTE FUNCTION public.sync_banned_with_is_active();

DROP TRIGGER IF EXISTS trg_system_users_sync_ban_upd ON public.system_users;
CREATE TRIGGER trg_system_users_sync_ban_upd
AFTER UPDATE OF is_active, user_id ON public.system_users
FOR EACH ROW EXECUTE FUNCTION public.sync_banned_with_is_active();

-- Optional: if a system user row is removed, keep the linked auth user blocked
DROP TRIGGER IF EXISTS trg_system_users_sync_ban_del ON public.system_users;
CREATE TRIGGER trg_system_users_sync_ban_del
AFTER DELETE ON public.system_users
FOR EACH ROW EXECUTE FUNCTION public.sync_banned_with_is_active();

-- Backfill to current state
-- Block all currently inactive system users
UPDATE auth.users u
SET banned_until = 'infinity'
FROM public.system_users su
WHERE su.user_id = u.id AND su.is_active = false;

-- Unblock all currently active system users
UPDATE auth.users u
SET banned_until = NULL
FROM public.system_users su
WHERE su.user_id = u.id AND COALESCE(su.is_active, true) = true;








