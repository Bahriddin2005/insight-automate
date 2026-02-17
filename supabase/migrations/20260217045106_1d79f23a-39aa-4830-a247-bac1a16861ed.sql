
-- Create chart_annotations table for collaborative notes
CREATE TABLE public.chart_annotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  dashboard_id TEXT NOT NULL,
  chart_key TEXT NOT NULL,
  data_point_label TEXT NOT NULL,
  data_point_value NUMERIC,
  note TEXT NOT NULL,
  color TEXT DEFAULT 'primary',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chart_annotations ENABLE ROW LEVEL SECURITY;

-- Users can view annotations on dashboards they have access to (own or public)
CREATE POLICY "Users can view own annotations"
  ON public.chart_annotations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view shared annotations"
  ON public.chart_annotations FOR SELECT
  USING (
    dashboard_id IN (
      SELECT share_token FROM public.dashboard_configs WHERE is_public = true
    )
  );

CREATE POLICY "Users can insert own annotations"
  ON public.chart_annotations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own annotations"
  ON public.chart_annotations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own annotations"
  ON public.chart_annotations FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_chart_annotations_updated_at
  BEFORE UPDATE ON public.chart_annotations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookups
CREATE INDEX idx_chart_annotations_dashboard ON public.chart_annotations(dashboard_id, chart_key);
