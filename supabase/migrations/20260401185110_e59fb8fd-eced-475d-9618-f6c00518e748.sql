-- Add reminder tracking columns to appointments
ALTER TABLE public.appointments
ADD COLUMN reminder_24h_sent boolean NOT NULL DEFAULT false,
ADD COLUMN reminder_1h_sent boolean NOT NULL DEFAULT false;