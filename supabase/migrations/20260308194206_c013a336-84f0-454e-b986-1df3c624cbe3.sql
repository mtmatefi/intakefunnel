
-- Table to store innovations pushed from Strategy Sculptor
CREATE TABLE public.synced_innovations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text NOT NULL,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  hypothesis text,
  expected_outcome text,
  value_proposition text,
  effort_estimate text,
  learnings text,
  responsible text,
  stage text NOT NULL DEFAULT 'ideation',
  status text DEFAULT 'green',
  target_date date,
  product_name text,
  impact_data jsonb DEFAULT '[]'::jsonb,
  trend_data jsonb DEFAULT '[]'::jsonb,
  risk_data jsonb DEFAULT '[]'::jsonb,
  source_app text NOT NULL DEFAULT 'strategy_sculptor',
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(external_id, source_app)
);

ALTER TABLE public.synced_innovations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view synced innovations"
  ON public.synced_innovations FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System can insert synced innovations"
  ON public.synced_innovations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update synced innovations"
  ON public.synced_innovations FOR UPDATE
  USING (true);

-- Feedback table for Product Owner comments on innovations
CREATE TABLE public.innovation_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  innovation_id uuid NOT NULL REFERENCES public.synced_innovations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  comment text NOT NULL,
  feedback_type text NOT NULL DEFAULT 'comment',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.innovation_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view innovation feedback"
  ON public.innovation_feedback FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can create innovation feedback"
  ON public.innovation_feedback FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own innovation feedback"
  ON public.innovation_feedback FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own innovation feedback"
  ON public.innovation_feedback FOR DELETE TO authenticated
  USING (user_id = auth.uid());
