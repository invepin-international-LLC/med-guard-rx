-- Add unique constraint for dose_logs to prevent duplicate reminders
-- This allows upsert to work properly when tracking reminder sent status
ALTER TABLE public.dose_logs 
ADD CONSTRAINT dose_logs_scheduled_dose_scheduled_for_unique 
UNIQUE (scheduled_dose_id, scheduled_for);

-- Enable required extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule dose reminders to run every 5 minutes
SELECT cron.schedule(
  'schedule-dose-reminders',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://oiritkkxlvwhuvppteyi.supabase.co/functions/v1/schedule-dose-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pcml0a2t4bHZ3aHV2cHB0ZXlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyODcyNzUsImV4cCI6MjA4NDg2MzI3NX0.NJfqirkzZ4ebWFhWMwPSSDlOVgA9h3zNsXkTPtyM18s"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Also schedule missed dose checks every 5 minutes
SELECT cron.schedule(
  'check-missed-doses',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://oiritkkxlvwhuvppteyi.supabase.co/functions/v1/check-missed-doses',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pcml0a2t4bHZ3aHV2cHB0ZXlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyODcyNzUsImV4cCI6MjA4NDg2MzI3NX0.NJfqirkzZ4ebWFhWMwPSSDlOVgA9h3zNsXkTPtyM18s"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);