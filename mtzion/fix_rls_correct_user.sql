-- Fix RLS chicken-and-egg problem for system_users
-- Temporarily disable RLS to insert the first admin user
ALTER TABLE system_users DISABLE ROW LEVEL SECURITY;

-- Insert admin user for existing auth user (using correct user ID from console)
INSERT INTO system_users (user_id, username, full_name, email, role)
VALUES (
    'b3406f11-834b-4630-a3f3-2be9ca375df4',
    'admin',
    'System Administrator', 
    'admin@mtzionchurch.com',
    'admin'
) ON CONFLICT (user_id) DO UPDATE SET
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    role = EXCLUDED.role;

-- Re-enable RLS
ALTER TABLE system_users ENABLE ROW LEVEL SECURITY;

-- Add proper RLS policy that allows users to read their own profile
CREATE POLICY "Users can view their own system profile" ON system_users
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Add policy for admins to manage all system users
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

-- Verify the insert worked
SELECT 'system_users' as table_name, user_id, username, role FROM system_users WHERE user_id = 'b3406f11-834b-4630-a3f3-2be9ca375df4';







