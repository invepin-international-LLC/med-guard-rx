
CREATE TABLE public.symptom_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mood TEXT NOT NULL DEFAULT 'okay',
  symptoms TEXT[] NOT NULL DEFAULT '{}',
  severity TEXT NOT NULL DEFAULT 'mild',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.symptom_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their symptom logs"
ON public.symptom_logs
FOR ALL
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
