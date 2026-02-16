
-- Add template_id and chart_order columns to dashboard_configs
ALTER TABLE public.dashboard_configs 
ADD COLUMN IF NOT EXISTS template_id text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS chart_order jsonb DEFAULT NULL;
