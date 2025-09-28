-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create member_ministries table (junction table for members and ministries)
CREATE TABLE IF NOT EXISTS public.member_ministries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    ministry_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(member_id, ministry_name)
);

-- Enable RLS
ALTER TABLE public.member_ministries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can read member ministries" ON public.member_ministries
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage member ministries" ON public.member_ministries
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.system_users 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Create trigger for updated_at
CREATE TRIGGER update_member_ministries_updated_at 
    BEFORE UPDATE ON public.member_ministries 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_member_ministries_member_id ON public.member_ministries(member_id);
CREATE INDEX IF NOT EXISTS idx_member_ministries_ministry_name ON public.member_ministries(ministry_name);
