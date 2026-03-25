
-- Allow users to delete their own data for account deletion (Apple Guideline 5.1.1(v))
CREATE POLICY "Users can delete their own adherence streaks"
ON public.adherence_streaks FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profiles"
ON public.profiles FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own symptom logs"
ON public.symptom_logs FOR DELETE TO authenticated
USING (auth.uid() = user_id);
