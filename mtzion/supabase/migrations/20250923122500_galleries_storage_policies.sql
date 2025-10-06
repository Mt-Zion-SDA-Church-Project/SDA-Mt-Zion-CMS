/*
  Storage policies for galleries bucket so members can view and admins can manage
*/

-- Ensure storage RLS is enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Read policy for all authenticated users
DROP POLICY IF EXISTS "Authenticated can read galleries bucket" ON storage.objects;
CREATE POLICY "Authenticated can read galleries bucket" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id IN ('galleries', 'Galleries'));

-- Write policies for admins
DROP POLICY IF EXISTS "Admins can upload to galleries bucket" ON storage.objects;
CREATE POLICY "Admins can upload to galleries bucket" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('galleries', 'Galleries') AND
    EXISTS (
      SELECT 1 FROM public.system_users su
      WHERE su.user_id = auth.uid()
        AND su.role IN ('admin','super_admin')
        AND su.is_active = true
    )
  );

DROP POLICY IF EXISTS "Admins can update galleries bucket" ON storage.objects;
CREATE POLICY "Admins can update galleries bucket" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('galleries', 'Galleries') AND
    EXISTS (
      SELECT 1 FROM public.system_users su
      WHERE su.user_id = auth.uid()
        AND su.role IN ('admin','super_admin')
        AND su.is_active = true
    )
  )
  WITH CHECK (
    bucket_id IN ('galleries', 'Galleries') AND
    EXISTS (
      SELECT 1 FROM public.system_users su
      WHERE su.user_id = auth.uid()
        AND su.role IN ('admin','super_admin')
        AND su.is_active = true
    )
  );

DROP POLICY IF EXISTS "Admins can delete from galleries bucket" ON storage.objects;
CREATE POLICY "Admins can delete from galleries bucket" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id IN ('galleries', 'Galleries') AND
    EXISTS (
      SELECT 1 FROM public.system_users su
      WHERE su.user_id = auth.uid()
        AND su.role IN ('admin','super_admin')
        AND su.is_active = true
    )
  );




