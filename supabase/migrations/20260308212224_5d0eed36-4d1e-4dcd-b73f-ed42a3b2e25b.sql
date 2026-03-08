
-- Add author_name and source_app to innovation_feedback for cross-project comments
ALTER TABLE public.innovation_feedback 
  ADD COLUMN IF NOT EXISTS author_name text,
  ADD COLUMN IF NOT EXISTS source_app text NOT NULL DEFAULT 'intake_funnel';

-- Allow public insert for webhook (external Sculptor comments)
CREATE POLICY "Webhook can insert external feedback"
  ON public.innovation_feedback
  FOR INSERT
  WITH CHECK (true);
