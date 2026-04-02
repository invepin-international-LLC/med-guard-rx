
CREATE POLICY "Block direct drug_interactions inserts"
ON public.drug_interactions
FOR INSERT
WITH CHECK (false);

CREATE POLICY "Block direct drug_interactions updates"
ON public.drug_interactions
FOR UPDATE
USING (false);

CREATE POLICY "Block direct drug_interactions deletes"
ON public.drug_interactions
FOR DELETE
USING (false);
