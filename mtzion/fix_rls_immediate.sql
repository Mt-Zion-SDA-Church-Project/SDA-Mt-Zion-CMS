-- Immediate fix for RLS policies causing 406 errors
-- This will allow the user to access their own profile

-- First, let's temporarily disable RLS to see if that fixes the issue
ALTER TABLE system_users DISABLE ROW LEVEL SECURITY;

-- Check if the user exists
SELECT 'User check:' as step, user_id, username, full_name, email, role, is_active 
FROM system_users 
WHERE user_id = '00694591-5d2b-4781-929c-0c2602aa2c35';

-- If the user doesn't exist, insert them
INSERT INTO system_users (user_id, username, full_name, email, role, is_active)
VALUES (
    '00694591-5d2b-4781-929c-0c2602aa2c35',
    'admin',
    'System Administrator', 
    'admin@mtzionchurch.com',
    'admin',
    true
) ON CONFLICT (user_id) DO UPDATE SET
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active;

-- Re-enable RLS with a simple policy
ALTER TABLE system_users ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
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

-- Test the query
SELECT 'Testing query:' as step, * FROM system_users WHERE user_id = '00694591-5d2b-4781-929c-0c2602aa2c35';


