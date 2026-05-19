ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS country text;

-- Backfill country from existing work_permit / visa package names where obvious
UPDATE public.packages
SET country = split_part(name, ' ', 1)
WHERE country IS NULL
  AND type IN ('work_permit', 'visa', 'student_consultancy')
  AND name ~ '^[A-Z][a-z]+\s';

CREATE INDEX IF NOT EXISTS idx_packages_type_country ON public.packages (type, country);