-- Fix RLS policies for system_users table
-- The user exists but RLS policies are preventing access

-- First, let's check if the user exists
SELECT 'Checking if user exists in system_users' as step;
SELECT user_id, username, full_name, email, role, is_active 
FROM system_users 
WHERE user_id = 'b3406f11-834b-4630-a3f3-2be9ca375df4';

-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Users can view their own system profile" ON system_users;
DROP POLICY IF EXISTS "Admins can manage all system users" ON system_users;

-- Create a simple policy that allows users to read their own profile
CREATE POLICY "Users can view their own system profile" ON system_users
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Create policy for admins to manage all system users
CREATE POLICY "Admins can manage all system users" ON system_users
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM system_users 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
            AND is_active = true
        )
    );

-- Also create a policy that allows system users to read their own data for updates
CREATE POLICY "System users can update their own profile" ON system_users
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

-- Verify the policies are working
SELECT 'Verifying RLS policies' as step;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'system_users';

-- Test the query that the app is trying to run
SELECT 'Testing the app query' as step;
SELECT * FROM system_users WHERE user_id = 'b3406f11-834b-4630-a3f3-2be9ca375df4';



