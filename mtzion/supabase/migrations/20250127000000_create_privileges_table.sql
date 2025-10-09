-- Create privileges table for controlling user access to dashboard tabs
CREATE TABLE IF NOT EXISTS public.user_privileges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('admin', 'member')),
    tab_name VARCHAR(50) NOT NULL,
    is_allowed BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, tab_name)
);

-- Enable RLS
ALTER TABLE public.user_privileges ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Super admins can manage all privileges" ON public.user_privileges
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.system_users 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
            AND is_active = true
        )
    );

CREATE POLICY "Users can read their own privileges" ON public.user_privileges
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_privileges_user_id ON public.user_privileges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_privileges_user_type ON public.user_privileges(user_type);
CREATE INDEX IF NOT EXISTS idx_user_privileges_tab_name ON public.user_privileges(tab_name);

-- Create trigger for updated_at
CREATE TRIGGER update_user_privileges_updated_at 
    BEFORE UPDATE ON public.user_privileges 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default privileges for existing users (all tabs allowed by default)
-- This will be handled by the application logic

