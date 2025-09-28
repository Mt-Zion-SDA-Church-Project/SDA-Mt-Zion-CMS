/*
  Send login credentials to system users after email confirmation
  This trigger will be activated when a user's email is confirmed in auth.users
*/

-- Create a function to log when credentials should be sent
CREATE OR REPLACE FUNCTION public.log_credentials_email_needed()
RETURNS TRIGGER AS $$
DECLARE
  system_user_record RECORD;
BEGIN
  -- Only proceed if email was just confirmed (email_confirmed_at changed from NULL to a timestamp)
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    
    -- Get the system user record
    SELECT * INTO system_user_record
    FROM public.system_users
    WHERE user_id = NEW.id;
    
    -- Only log if this is a system user
    IF system_user_record IS NOT NULL THEN
      
      -- Log that credentials email should be sent
      INSERT INTO public.activity_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        new_data
      ) VALUES (
        NEW.id,
        'email_confirmed_credentials_needed',
        'system_user',
        system_user_record.id,
        jsonb_build_object(
          'email', NEW.email,
          'username', system_user_record.username,
          'role', system_user_record.role,
          'full_name', system_user_record.full_name,
          'email_confirmed_at', NEW.email_confirmed_at
        )
      );
      
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_log_credentials_email_needed ON auth.users;
CREATE TRIGGER trg_log_credentials_email_needed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.log_credentials_email_needed();

-- Add processed field to activity_logs if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'activity_logs' AND column_name = 'processed'
  ) THEN
    ALTER TABLE public.activity_logs ADD COLUMN processed boolean DEFAULT false;
  END IF;
END $$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.log_credentials_email_needed() TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_credentials_email_needed() TO service_role;
