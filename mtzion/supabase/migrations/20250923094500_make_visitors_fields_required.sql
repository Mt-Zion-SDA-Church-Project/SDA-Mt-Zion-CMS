/*
  Make key visitors fields required
*/

ALTER TABLE public.visitors
  ALTER COLUMN first_name SET NOT NULL,
  ALTER COLUMN last_name SET NOT NULL,
  ALTER COLUMN phone SET NOT NULL,
  ALTER COLUMN email SET NOT NULL,
  ALTER COLUMN address SET NOT NULL,
  ALTER COLUMN date_of_birth SET NOT NULL;










