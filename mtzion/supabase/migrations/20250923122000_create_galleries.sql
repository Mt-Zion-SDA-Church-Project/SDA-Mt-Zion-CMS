/*
  Create galleries (albums) and gallery_photos tables linked to events.
  RLS policies:
    - All authenticated users can read galleries and photos
    - Admins/Super Admins can insert/update/delete
*/

-- Galleries (albums) table
CREATE TABLE IF NOT EXISTS public.galleries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  cover_image_url text,
  cover_image_path text,
  created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Photos table
CREATE TABLE IF NOT EXISTS public.gallery_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid REFERENCES public.galleries(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  image_url text NOT NULL,
  image_path text NOT NULL,
  caption text,
  created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_photos ENABLE ROW LEVEL SECURITY;

-- Read policies (all authenticated)
DROP POLICY IF EXISTS "Authenticated can read galleries" ON public.galleries;
CREATE POLICY "Authenticated can read galleries" ON public.galleries
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can read gallery photos" ON public.gallery_photos;
CREATE POLICY "Authenticated can read gallery photos" ON public.gallery_photos
  FOR SELECT TO authenticated
  USING (true);

-- Write policies (admins only)
DROP POLICY IF EXISTS "Admins can modify galleries" ON public.galleries;
CREATE POLICY "Admins can modify galleries" ON public.galleries
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

DROP POLICY IF EXISTS "Admins can modify gallery photos" ON public.gallery_photos;
CREATE POLICY "Admins can modify gallery photos" ON public.gallery_photos
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




