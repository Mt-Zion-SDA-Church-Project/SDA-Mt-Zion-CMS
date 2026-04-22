/*
  Prevent duplicate QR / manual check-ins for the same event:
  one attendance row per (member_id, event_id) when event_id is set.
*/

-- Remove duplicates (keep earliest check-in per member+event)
DELETE FROM public.attendance a
USING public.attendance b
WHERE a.event_id IS NOT NULL
  AND b.event_id IS NOT NULL
  AND a.member_id = b.member_id
  AND a.event_id = b.event_id
  AND a.check_in_time > b.check_in_time;

-- Fallback if timestamps tie: keep lexicographically smaller id
DELETE FROM public.attendance a
USING public.attendance b
WHERE a.event_id IS NOT NULL
  AND b.event_id IS NOT NULL
  AND a.member_id = b.member_id
  AND a.event_id = b.event_id
  AND a.id > b.id;

CREATE UNIQUE INDEX IF NOT EXISTS attendance_unique_member_event
  ON public.attendance (member_id, event_id)
  WHERE event_id IS NOT NULL;
