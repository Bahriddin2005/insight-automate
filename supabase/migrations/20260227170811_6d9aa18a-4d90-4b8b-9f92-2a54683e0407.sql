
-- Tableau vizzes managed by admin
CREATE TABLE public.tableau_vizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  viz_url text NOT NULL,
  project text DEFAULT '',
  tags text[] DEFAULT '{}',
  allowed_roles text[] DEFAULT '{}',
  description text DEFAULT '',
  is_active boolean DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tableau_vizzes ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view active vizzes
CREATE POLICY "Authenticated users can view active vizzes"
  ON public.tableau_vizzes FOR SELECT TO authenticated
  USING (is_active = true);

-- Only creator can insert/update/delete
CREATE POLICY "Creator can insert vizzes"
  ON public.tableau_vizzes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator can update vizzes"
  ON public.tableau_vizzes FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Creator can delete vizzes"
  ON public.tableau_vizzes FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- Tableau refresh logs
CREATE TABLE public.tableau_refresh_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type text NOT NULL DEFAULT 'workbook',
  resource_id text NOT NULL,
  resource_name text DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  error text,
  triggered_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tableau_refresh_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view refresh logs"
  ON public.tableau_refresh_logs FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert refresh logs"
  ON public.tableau_refresh_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = triggered_by);
