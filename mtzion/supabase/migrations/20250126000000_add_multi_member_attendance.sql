/*
  Add support for multi-member attendance check-ins
  - Add fields to track multiple members in a single check-in
  - Add support for manual name entry when members don't exist in database
*/

-- Add new fields to attendance table
ALTER TABLE public.attendance 
  ADD COLUMN IF NOT EXISTS member_names text[],
  ADD COLUMN IF NOT EXISTS is_multi_member boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS checked_in_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS check_in_method text DEFAULT 'qr_scan';

-- Create index for better performance on multi-member queries
CREATE INDEX IF NOT EXISTS idx_attendance_multi_member ON public.attendance(is_multi_member);
CREATE INDEX IF NOT EXISTS idx_attendance_checked_in_by ON public.attendance(checked_in_by);

-- Update the attendance_type enum to include more options
ALTER TYPE attendance_type ADD VALUE IF NOT EXISTS 'multi_member';

-- Add comment to explain the new fields
COMMENT ON COLUMN public.attendance.member_names IS 'Array of member names for multi-member check-ins when members are not in the database';
COMMENT ON COLUMN public.attendance.is_multi_member IS 'Indicates if this attendance record represents multiple members';
COMMENT ON COLUMN public.attendance.checked_in_by IS 'User who performed the check-in (for multi-member check-ins)';
COMMENT ON COLUMN public.attendance.check_in_method IS 'Method used for check-in: qr_scan, manual_entry, etc.';





