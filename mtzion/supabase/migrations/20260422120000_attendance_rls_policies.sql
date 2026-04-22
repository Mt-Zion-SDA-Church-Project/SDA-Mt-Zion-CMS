/*
  Attendance RLS was enabled in the initial schema without policies,
  which blocks all reads/writes. Add policies so members can self check-in
  (QR) and read their own rows, and admins can manage all attendance.
*/

-- Member: read own attendance rows
DROP POLICY IF EXISTS "Members read own attendance" ON public.attendance;
CREATE POLICY "Members read own attendance" ON public.attendance
  FOR SELECT
  TO authenticated
  USING (
    member_id IN (
      SELECT id FROM public.members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Member: insert only for own member_id (QR / self check-in)
DROP POLICY IF EXISTS "Members insert own attendance" ON public.attendance;
CREATE POLICY "Members insert own attendance" ON public.attendance
  FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id IN (
      SELECT id FROM public.members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Admins: full access
DROP POLICY IF EXISTS "Admins manage all attendance" ON public.attendance;
CREATE POLICY "Admins manage all attendance" ON public.attendance
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.system_users
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin')
        AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.system_users
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin')
        AND is_active = true
    )
  );
