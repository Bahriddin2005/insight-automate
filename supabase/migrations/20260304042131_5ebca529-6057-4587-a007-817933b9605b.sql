
CREATE TABLE public.churn_risk_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  student_name TEXT NOT NULL,
  sinf TEXT,
  total_paid NUMERIC NOT NULL DEFAULT 0,
  tx_count INTEGER NOT NULL DEFAULT 0,
  avg_payment NUMERIC NOT NULL DEFAULT 0,
  last_payment_date DATE,
  recency_days INTEGER NOT NULL DEFAULT 0,
  risk_score INTEGER NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'low',
  preferred_method TEXT,
  ai_recommendation TEXT,
  file_name TEXT,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.churn_risk_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own scores" ON public.churn_risk_scores
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own scores" ON public.churn_risk_scores
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scores" ON public.churn_risk_scores
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_churn_scores_user ON public.churn_risk_scores(user_id, snapshot_date);
