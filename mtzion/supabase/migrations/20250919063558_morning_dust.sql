/*
  # SDA Mt. Zion Church Management System Database Schema

  1. New Tables
    - `families` - Family groups that members belong to
    - `ministries` - Church ministries (choir, ushers, etc.)
    - `members` - Church members with personal details
    - `member_ministries` - Many-to-many relationship for member ministry participation
    - `visitors` - Church visitors tracking
    - `events` - Church events and activities
    - `attendance` - QR code-based attendance records
    - `tithes` - Tithe records with payment tracking
    - `offerings` - Offering records with payment tracking
    - `sabbath_schools` - Sabbath school classes
    - `teens` - Teen ministry tracking
    - `system_users` - Admin users for system access
    - `system_logs` - Activity and audit logs

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access (admin/member)
    - Secure payment and sensitive data
*/

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'member', 'super_admin');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');
CREATE TYPE attendance_type AS ENUM ('service', 'sabbath_school', 'prayer_meeting', 'event');
CREATE TYPE member_status AS ENUM ('active', 'inactive', 'transferred', 'deceased');

-- Families table
CREATE TABLE IF NOT EXISTS families (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_name text NOT NULL,
    head_of_family uuid REFERENCES auth.users(id),
    address text,
    phone text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Ministries table
CREATE TABLE IF NOT EXISTS ministries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    description text,
    leader_id uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Members table
CREATE TABLE IF NOT EXISTS members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) UNIQUE,
    member_number text UNIQUE NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    middle_name text,
    date_of_birth date,
    gender text CHECK (gender IN ('male', 'female')),
    phone text,
    email text,
    address text,
    family_id uuid REFERENCES families(id),
    baptism_date date,
    membership_date date DEFAULT CURRENT_DATE,
    status member_status DEFAULT 'active',
    occupation text,
    emergency_contact text,
    emergency_phone text,
    photo_url text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Member ministries junction table
CREATE TABLE IF NOT EXISTS member_ministries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id uuid REFERENCES members(id) ON DELETE CASCADE,
    ministry_id uuid REFERENCES ministries(id) ON DELETE CASCADE,
    joined_date date DEFAULT CURRENT_DATE,
    role text DEFAULT 'member',
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    UNIQUE(member_id, ministry_id)
);

-- Visitors table
CREATE TABLE IF NOT EXISTS visitors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name text NOT NULL,
    last_name text NOT NULL,
    phone text,
    email text,
    address text,
    visit_date date DEFAULT CURRENT_DATE,
    invited_by uuid REFERENCES members(id),
    follow_up_notes text,
    converted_to_member boolean DEFAULT false,
    member_id uuid REFERENCES members(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    event_date timestamptz NOT NULL,
    end_date timestamptz,
    location text,
    event_type text DEFAULT 'general',
    created_by uuid REFERENCES auth.users(id),
    max_attendees integer,
    registration_required boolean DEFAULT false,
    qr_code text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id uuid REFERENCES members(id),
    event_id uuid REFERENCES events(id),
    attendance_date date DEFAULT CURRENT_DATE,
    attendance_type attendance_type DEFAULT 'service',
    check_in_time timestamptz DEFAULT now(),
    qr_scanned boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- Tithes table
CREATE TABLE IF NOT EXISTS tithes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id uuid REFERENCES members(id),
    amount decimal(10,2) NOT NULL,
    tithe_date date DEFAULT CURRENT_DATE,
    payment_method text DEFAULT 'cash',
    payment_reference text,
    payment_status payment_status DEFAULT 'completed',
    notes text,
    recorded_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Offerings table
CREATE TABLE IF NOT EXISTS offerings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id uuid REFERENCES members(id),
    amount decimal(10,2) NOT NULL,
    offering_type text NOT NULL DEFAULT 'general',
    offering_date date DEFAULT CURRENT_DATE,
    payment_method text DEFAULT 'cash',
    payment_reference text,
    payment_status payment_status DEFAULT 'completed',
    notes text,
    recorded_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Sabbath schools table
CREATE TABLE IF NOT EXISTS sabbath_schools (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_name text NOT NULL,
    teacher_id uuid REFERENCES members(id),
    age_range text,
    description text,
    meeting_time time,
    classroom text,
    max_students integer,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Teens table
CREATE TABLE IF NOT EXISTS teens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id uuid REFERENCES members(id),
    sabbath_school_id uuid REFERENCES sabbath_schools(id),
    parent_member_id uuid REFERENCES members(id),
    school_name text,
    grade_level text,
    interests text[],
    medical_conditions text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- System users table
CREATE TABLE IF NOT EXISTS system_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) UNIQUE,
    username text UNIQUE NOT NULL,
    full_name text NOT NULL,
    email text NOT NULL,
    role user_role DEFAULT 'admin',
    permissions text[],
    is_active boolean DEFAULT true,
    last_login timestamptz,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- System logs table
CREATE TABLE IF NOT EXISTS system_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id),
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    old_data jsonb,
    new_data jsonb,
    ip_address text,
    user_agent text,
    created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministries ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_ministries ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE tithes ENABLE ROW LEVEL SECURITY;
ALTER TABLE offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sabbath_schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE teens ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Policies for members (can read their own data)
CREATE POLICY "Members can view their own data" ON members
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Members can update their own data" ON members
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

-- Policies for tithes and offerings
CREATE POLICY "Members can view their own tithes" ON tithes
    FOR SELECT TO authenticated
    USING (member_id IN (SELECT id FROM members WHERE user_id = auth.uid()));

CREATE POLICY "Members can view their own offerings" ON offerings
    FOR SELECT TO authenticated
    USING (member_id IN (SELECT id FROM members WHERE user_id = auth.uid()));

-- Admin policies (admins can see everything)
CREATE POLICY "Admins can manage all data" ON members
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM system_users 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
            AND is_active = true
        )
    );

CREATE POLICY "Admins can manage families" ON families
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM system_users 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
            AND is_active = true
        )
    );

CREATE POLICY "Admins can manage visitors" ON visitors
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM system_users 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
            AND is_active = true
        )
    );

-- Create indexes for performance
CREATE INDEX idx_members_user_id ON members(user_id);
CREATE INDEX idx_members_family_id ON members(family_id);
CREATE INDEX idx_members_status ON members(status);
CREATE INDEX idx_attendance_member_id ON attendance(member_id);
CREATE INDEX idx_attendance_date ON attendance(attendance_date);
CREATE INDEX idx_tithes_member_id ON tithes(member_id);
CREATE INDEX idx_tithes_date ON tithes(tithe_date);
CREATE INDEX idx_offerings_member_id ON offerings(member_id);
CREATE INDEX idx_offerings_date ON offerings(offering_date);
CREATE INDEX idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at);

-- Insert sample ministries
INSERT INTO ministries (name, description) VALUES
    ('Choir', 'Church choir ministry'),
    ('Ushers', 'Church ushering ministry'),
    ('Youth', 'Youth ministry'),
    ('Women''s Ministry', 'Women''s ministry activities'),
    ('Men''s Ministry', 'Men''s ministry activities'),
    ('Children''s Ministry', 'Children''s ministry and sabbath school'),
    ('Music', 'Church music ministry'),
    ('Media', 'Audio visual and technical ministry');

-- Insert sample sabbath school classes
INSERT INTO sabbath_schools (class_name, age_range, description, meeting_time) VALUES
    ('Cradle Roll', '0-3 years', 'Toddlers and babies', '09:30:00'),
    ('Kindergarten', '4-6 years', 'Pre-school children', '09:30:00'),
    ('Primary', '7-9 years', 'Primary school children', '09:30:00'),
    ('Juniors', '10-12 years', 'Junior school children', '09:30:00'),
    ('Earliteen', '13-14 years', 'Early teenagers', '09:30:00'),
    ('Youth', '15-18 years', 'Teenage youth', '09:30:00'),
    ('Young Adults', '19-35 years', 'Young adults', '09:30:00'),
    ('Adults', '36+ years', 'Adult members', '09:30:00');