-- Add extra member fields based on new Add Member form
-- Safe-guard: only add columns if they do not already exist

DO $$
BEGIN
  -- residence
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'residence'
  ) THEN
    ALTER TABLE public.members ADD COLUMN residence text;
  END IF;

  -- place_of_birth
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'place_of_birth'
  ) THEN
    ALTER TABLE public.members ADD COLUMN place_of_birth text;
  END IF;

  -- middle_name already exists in types, but ensure presence
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'middle_name'
  ) THEN
    ALTER TABLE public.members ADD COLUMN middle_name text;
  END IF;

  -- gender ensure ENUM compatibility; if gender is text in DB adjust as needed
  -- date_of_birth covered as existing in types; ensure presence
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'date_of_birth'
  ) THEN
    ALTER TABLE public.members ADD COLUMN date_of_birth date;
  END IF;

END $$;

-- Optional: username on system_users for new onboarding
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'system_users' AND column_name = 'username'
  ) THEN
    ALTER TABLE public.system_users ADD COLUMN username text UNIQUE;
  END IF;
END $$;





