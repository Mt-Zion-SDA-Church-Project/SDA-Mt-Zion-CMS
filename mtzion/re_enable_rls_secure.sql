-- Re-enable RLS with proper security policies
-- This will maintain security while allowing the app to work

-- Re-enable RLS
ALTER TABLE system_users ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies first
DROP POLICY IF EXISTS "Users can view their own system profile" ON system_users;
DROP POLICY IF EXISTS "Admins can manage all system users" ON system_users;
DROP POLICY IF EXISTS "System users can update their own profile" ON system_users;

-- Create a simple policy that allows authenticated users to read their own profile
CREATE POLICY "Users can view their own system profile" ON system_users
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Create a policy for admins to manage all system users
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

-- Test that the policies work
SELECT 'Testing RLS policies:' as step;
SELECT * FROM system_users WHERE user_id = '00694591-5d2b-4781-929c-0c2602aa2c35';


