/* Seed static families and enforce unique names */

ALTER TABLE public.families
  ADD COLUMN IF NOT EXISTS family_name text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_families_family_name ON public.families(family_name);

INSERT INTO public.families (family_name)
SELECT v FROM (VALUES
  ('Bethel'),
  ('Nazareth'),
  ('Bethlethem'),
  ('Jerusalem')
) AS t(v)
ON CONFLICT (family_name) DO NOTHING;








