/*
  Add date_of_birth to visitors and keep updated_at fresh
*/

ALTER TABLE public.visitors
  ADD COLUMN IF NOT EXISTS date_of_birth date;

-- Reuse set_updated_at if present, else create it
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_visitors_set_updated_at ON public.visitors;
CREATE TRIGGER trg_visitors_set_updated_at
BEFORE UPDATE ON public.visitors
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();










