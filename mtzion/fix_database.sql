-- Fix Supabase database for SDA Mt. Zion Church Management System
-- Run this in Supabase SQL Editor

-- 1. Add missing RLS policy for system_users table
CREATE POLICY "Users can view their own system profile" ON system_users
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- 2. Add policy for admins to manage system_users
CREATE POLICY "Admins can manage system users" ON system_users
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM system_users 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
            AND is_active = true
        )
    );

-- 3. Insert a test admin user (replace with your actual user ID from console)
-- Get your user ID from browser console: "Fetching user profile for: YOUR-USER-ID"
INSERT INTO system_users (user_id, username, full_name, email, role)
VALUES (
    'b3406f11-834b-4630-a3f3-2be9ca375df4',  -- Replace with your actual user ID
    'admin',
    'System Administrator', 
    'admin@mtzionchurch.com',
    'admin'
) ON CONFLICT (user_id) DO NOTHING;

-- 4. Insert a test member user (optional)
INSERT INTO members (user_id, member_number, first_name, last_name, email)
VALUES (
    'b3406f11-834b-4630-a3f3-2be9ca375df4',  -- Replace with your actual user ID
    'M001',
    'Test',
    'Member',
    'member@mtzionchurch.com'
) ON CONFLICT (user_id) DO NOTHING;

-- 5. Verify the data was inserted
SELECT 'system_users' as table_name, user_id, username, role FROM system_users WHERE user_id = 'b3406f11-834b-4630-a3f3-2be9ca375df4'
UNION ALL
SELECT 'members' as table_name, user_id::text, first_name || ' ' || last_name, 'member' FROM members WHERE user_id = 'b3406f11-834b-4630-a3f3-2be9ca375df4';




