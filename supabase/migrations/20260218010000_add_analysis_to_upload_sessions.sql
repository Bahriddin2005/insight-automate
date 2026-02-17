-- Add analysis_data to upload_sessions for session restore
ALTER TABLE public.upload_sessions ADD COLUMN IF NOT EXISTS analysis_data JSONB;
