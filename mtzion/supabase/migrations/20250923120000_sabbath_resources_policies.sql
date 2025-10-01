/*
  Create sabbath_resources table (if missing) and add RLS policies so that:
  - Admins/Super Admins can insert/update/delete
  - All authenticated users can select (download/view)
  Also add Storage policies for the Sabbath Resources bucket so that:
  - Admins/Super Admins can upload/update/delete objects in the bucket
  - All authenticated users can read (download) from the bucket
*/

-- 1) Table: sabbath_resources
CREATE TABLE IF NOT EXISTS public.sabbath_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL CHECK (category IN ('adult','children')),
  file_url text,
  file_path text NOT NULL,
  created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.sabbath_resources ENABLE ROW LEVEL SECURITY;

-- Allow everyone authenticated to read resources (members can download/list)
DROP POLICY IF EXISTS "Authenticated can read sabbath resources" ON public.sabbath_resources;
CREATE POLICY "Authenticated can read sabbath resources" ON public.sabbath_resources
  FOR SELECT TO authenticated
  USING (true);

-- Allow admins to insert
DROP POLICY IF EXISTS "Admins can insert sabbath resources" ON public.sabbath_resources;
CREATE POLICY "Admins can insert sabbath resources" ON public.sabbath_resources
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.system_users su
      WHERE su.user_id = auth.uid()
        AND su.role IN ('admin','super_admin')
        AND su.is_active = true
    )
  );

-- Allow admins to update/delete
DROP POLICY IF EXISTS "Admins can modify sabbath resources" ON public.sabbath_resources;
CREATE POLICY "Admins can modify sabbath resources" ON public.sabbath_resources
  FOR UPDATE TO authenticated
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

DROP POLICY IF EXISTS "Admins can delete sabbath resources" ON public.sabbath_resources;
CREATE POLICY "Admins can delete sabbath resources" ON public.sabbath_resources
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.system_users su
      WHERE su.user_id = auth.uid()
        AND su.role IN ('admin','super_admin')
        AND su.is_active = true
    )
  );

-- 2) Storage policies for bucket (handle both possible ids)
-- Note: Supabase bucket ids are usually lowercase without spaces. We support
-- both 'sabbath-resources' and 'Sabbath Resources' to match current config.

-- Ensure storage RLS is enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Read policy for all authenticated users
DROP POLICY IF EXISTS "Authenticated can read sabbath resources bucket" ON storage.objects;
CREATE POLICY "Authenticated can read sabbath resources bucket" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id IN ('sabbath-resources', 'Sabbath Resources'));

-- Write policies for admins
DROP POLICY IF EXISTS "Admins can upload to sabbath resources bucket" ON storage.objects;
CREATE POLICY "Admins can upload to sabbath resources bucket" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('sabbath-resources', 'Sabbath Resources') AND
    EXISTS (
      SELECT 1 FROM public.system_users su
      WHERE su.user_id = auth.uid()
        AND su.role IN ('admin','super_admin')
        AND su.is_active = true
    )
  );

DROP POLICY IF EXISTS "Admins can update sabbath resources bucket" ON storage.objects;
CREATE POLICY "Admins can update sabbath resources bucket" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('sabbath-resources', 'Sabbath Resources') AND
    EXISTS (
      SELECT 1 FROM public.system_users su
      WHERE su.user_id = auth.uid()
        AND su.role IN ('admin','super_admin')
        AND su.is_active = true
    )
  )
  WITH CHECK (
    bucket_id IN ('sabbath-resources', 'Sabbath Resources') AND
    EXISTS (
      SELECT 1 FROM public.system_users su
      WHERE su.user_id = auth.uid()
        AND su.role IN ('admin','super_admin')
        AND su.is_active = true
    )
  );

DROP POLICY IF EXISTS "Admins can delete from sabbath resources bucket" ON storage.objects;
CREATE POLICY "Admins can delete from sabbath resources bucket" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id IN ('sabbath-resources', 'Sabbath Resources') AND
    EXISTS (
      SELECT 1 FROM public.system_users su
      WHERE su.user_id = auth.uid()
        AND su.role IN ('admin','super_admin')
        AND su.is_active = true
    )
  );


