/*
  Link system users to members by adding user_id field to members table
  This allows system users to have detailed member information
*/

-- Add user_id field to members table to link with system_users
ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_members_user_id ON public.members(user_id);

-- Update RLS policy to allow system users to see their linked member data
DROP POLICY IF EXISTS "Members can view their own data" ON public.members;
CREATE POLICY "Members can view their own data" ON public.members
  FOR SELECT TO authenticated
  USING (
    -- Allow if user is the member themselves (via user_id)
    user_id = auth.uid()
    OR
    -- Allow if user is admin/super_admin
    EXISTS (
      SELECT 1 FROM public.system_users su
      WHERE su.user_id = auth.uid()
        AND su.role IN ('admin','super_admin')
        AND su.is_active = true
    )
  );

-- Update insert policy to allow system users to create member records
DROP POLICY IF EXISTS "Admins can insert members" ON public.members;
CREATE POLICY "Admins can insert members" ON public.members
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.system_users su
      WHERE su.user_id = auth.uid()
        AND su.role IN ('admin','super_admin')
        AND su.is_active = true
    )
  );

-- Update update policy to allow system users to update member records
DROP POLICY IF EXISTS "Admins can update members" ON public.members;
CREATE POLICY "Admins can update members" ON public.members
  FOR UPDATE TO authenticated
  USING (
    -- Allow if user is the member themselves
    user_id = auth.uid()
    OR
    -- Allow if user is admin/super_admin
    EXISTS (
      SELECT 1 FROM public.system_users su
      WHERE su.user_id = auth.uid()
        AND su.role IN ('admin','super_admin')
        AND su.is_active = true
    )
  )
  WITH CHECK (
    -- Same conditions for the updated data
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.system_users su
      WHERE su.user_id = auth.uid()
        AND su.role IN ('admin','super_admin')
        AND su.is_active = true
    )
  );

