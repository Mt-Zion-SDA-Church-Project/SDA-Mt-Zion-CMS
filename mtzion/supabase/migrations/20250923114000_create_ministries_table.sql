-- Create ministries table
CREATE TABLE IF NOT EXISTS public.ministries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    gender_restriction VARCHAR(10) CHECK (gender_restriction IN ('male', 'female')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ministries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can read ministries" ON public.ministries
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage ministries" ON public.ministries
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.system_users 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Insert default ministries
INSERT INTO public.ministries (name, gender_restriction, description) VALUES
    ('None', NULL, 'No ministry assigned'),
    ('Coristers', NULL, 'Church choir and music ministry'),
    ('Deacon', 'male', 'Male church leadership ministry'),
    ('Deaconess', 'female', 'Female church leadership ministry'),
    ('Communication', NULL, 'Media and communication ministry'),
    ('Education', NULL, 'Educational and teaching ministry'),
    ('Family', NULL, 'Family and marriage ministry'),
    ('Sabbath School', NULL, 'Sabbath School teaching ministry'),
    ('Health', NULL, 'Health and wellness ministry'),
    ('Men', 'male', 'Men\'s ministry'),
    ('Women', 'female', 'Women\'s ministry'),
    ('Stewardship', NULL, 'Financial stewardship ministry'),
    ('Youth', NULL, 'Youth and young adult ministry'),
    ('Publishing', NULL, 'Literature and publishing ministry')
ON CONFLICT (name) DO NOTHING;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ministries_updated_at 
    BEFORE UPDATE ON public.ministries 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();





