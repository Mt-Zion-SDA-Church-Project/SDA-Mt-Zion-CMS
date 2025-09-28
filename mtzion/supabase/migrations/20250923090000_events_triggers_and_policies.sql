/*
  # Events triggers and policies

  - Trigger to set created_by from auth.uid() on insert
  - Trigger to keep updated_at current on updates
  - RLS policies so members can read events, admins can manage
*/

-- updated_at trigger function (shared)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- created_by default via trigger if not provided
CREATE OR REPLACE FUNCTION public.set_event_created_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach triggers to events table
DROP TRIGGER IF EXISTS trg_events_set_updated_at ON public.events;
CREATE TRIGGER trg_events_set_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_events_set_created_by ON public.events;
CREATE TRIGGER trg_events_set_created_by
BEFORE INSERT ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.set_event_created_by();

-- Ensure RLS is enabled (idempotent if already enabled in base migration)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Policies
-- Anyone authenticated can read events
DROP POLICY IF EXISTS "Authenticated can read events" ON public.events;
CREATE POLICY "Authenticated can read events" ON public.events
  FOR SELECT TO authenticated
  USING (true);

-- Only admins/super_admins can insert/update/delete events
DROP POLICY IF EXISTS "Admins manage events" ON public.events;
CREATE POLICY "Admins manage events" ON public.events
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.system_users su
      WHERE su.user_id = auth.uid()
        AND su.role IN ('admin','super_admin')
        AND su.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.system_users su
      WHERE su.user_id = auth.uid()
        AND su.role IN ('admin','super_admin')
        AND su.is_active = true
    )
  );










