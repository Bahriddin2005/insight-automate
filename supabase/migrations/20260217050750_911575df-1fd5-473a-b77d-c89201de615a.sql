
-- Table for storing API connection configurations
CREATE TABLE public.api_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  endpoint_url text NOT NULL,
  method text NOT NULL DEFAULT 'GET',
  auth_type text NOT NULL DEFAULT 'none', -- none, bearer, api_key, custom
  auth_config jsonb NOT NULL DEFAULT '{}'::jsonb, -- encrypted token/key reference
  custom_headers jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_body jsonb,
  pagination_type text DEFAULT 'none', -- none, offset, cursor, page
  pagination_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  schedule text DEFAULT 'manual', -- manual, hourly, daily
  json_root_path text DEFAULT '', -- JSONPath-like root for nested data
  last_fetched_at timestamp with time zone,
  last_row_count integer DEFAULT 0,
  last_schema jsonb,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.api_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own connections" ON public.api_connections
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own connections" ON public.api_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own connections" ON public.api_connections
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own connections" ON public.api_connections
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_api_connections_updated_at
  BEFORE UPDATE ON public.api_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- API ingestion logs
CREATE TABLE public.api_ingestion_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id uuid NOT NULL REFERENCES public.api_connections(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'success', -- success, error, schema_change
  row_count integer DEFAULT 0,
  duration_ms integer DEFAULT 0,
  error_message text,
  schema_snapshot jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.api_ingestion_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logs" ON public.api_ingestion_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own logs" ON public.api_ingestion_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own logs" ON public.api_ingestion_logs
  FOR DELETE USING (auth.uid() = user_id);
