-- Create a join table for members and ministries (many-to-many)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'member_ministries'
  ) THEN
    CREATE TABLE public.member_ministries (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
      ministry_name text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(member_id, ministry_name)
    );
  END IF;
END $$;















