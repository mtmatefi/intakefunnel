
-- Track when a user last viewed feedback for an innovation
CREATE TABLE public.innovation_feedback_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  innovation_id uuid NOT NULL REFERENCES public.synced_innovations(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, innovation_id)
);

ALTER TABLE public.innovation_feedback_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own read status"
  ON public.innovation_feedback_reads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own read status"
  ON public.innovation_feedback_reads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own read status"
  ON public.innovation_feedback_reads FOR UPDATE
  USING (auth.uid() = user_id);
