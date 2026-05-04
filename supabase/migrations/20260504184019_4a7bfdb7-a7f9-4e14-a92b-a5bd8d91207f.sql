
ALTER TABLE public.packages DROP CONSTRAINT IF EXISTS packages_type_check;
ALTER TABLE public.packages ADD CONSTRAINT packages_type_check
  CHECK (type IN ('hajj','umrah','tour','work_permit','student_consultancy','other'));

INSERT INTO public.packages (name, type, description, price, duration_days, is_active, status, show_on_website, highlight_tag)
SELECT 'Fiji Work Permit Service', 'work_permit',
       'End-to-end Fiji work permit processing: BMET clearance, employer matching, visa, ticket.',
       0, 120, true, 'active', false, 'Service'
WHERE NOT EXISTS (SELECT 1 FROM public.packages WHERE type='work_permit' AND name='Fiji Work Permit Service');

INSERT INTO public.packages (name, type, description, price, duration_days, is_active, status, show_on_website, highlight_tag)
SELECT 'Overseas Student Consultancy', 'student_consultancy',
       'Overseas study counseling, university application, SOP, visa filing.',
       0, 90, true, 'active', false, 'Service'
WHERE NOT EXISTS (SELECT 1 FROM public.packages WHERE type='student_consultancy' AND name='Overseas Student Consultancy');
