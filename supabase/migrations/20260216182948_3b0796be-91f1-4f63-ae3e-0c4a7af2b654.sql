
-- Table to store past upload sessions (last 5)
CREATE TABLE public.upload_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  row_count INTEGER NOT NULL DEFAULT 0,
  column_count INTEGER NOT NULL DEFAULT 0,
  quality_score INTEGER NOT NULL DEFAULT 0,
  missing_percent NUMERIC NOT NULL DEFAULT 0,
  duplicates_removed INTEGER NOT NULL DEFAULT 0,
  column_info JSONB,
  ai_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.upload_sessions ENABLE ROW LEVEL SECURITY;

-- Public access (no auth required for this app)
CREATE POLICY "Anyone can view sessions" ON public.upload_sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert sessions" ON public.upload_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete sessions" ON public.upload_sessions FOR DELETE USING (true);
