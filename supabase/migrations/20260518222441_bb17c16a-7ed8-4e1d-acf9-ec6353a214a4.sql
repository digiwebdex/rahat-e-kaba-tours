CREATE POLICY "Public can view active supplier agents basic"
ON public.supplier_agents
FOR SELECT
TO anon, authenticated
USING (status = 'active');