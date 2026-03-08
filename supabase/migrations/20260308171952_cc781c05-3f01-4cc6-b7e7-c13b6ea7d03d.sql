
-- Guideline version history table
CREATE TABLE public.guideline_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guideline_id UUID NOT NULL REFERENCES public.guidelines(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  change_reason TEXT NOT NULL,
  change_source TEXT NOT NULL DEFAULT 'manual',
  intake_id UUID REFERENCES public.intakes(id) ON DELETE SET NULL,
  
  -- Snapshot of the guideline at this version
  name TEXT NOT NULL,
  description TEXT,
  content_markdown TEXT NOT NULL,
  type TEXT NOT NULL,
  compliance_framework TEXT,
  severity TEXT,
  risk_categories TEXT[] DEFAULT '{}',
  review_frequency_days INTEGER DEFAULT 365,
  
  -- Diff info
  changed_fields TEXT[] DEFAULT '{}',
  previous_values JSONB DEFAULT '{}'
);

ALTER TABLE public.guideline_versions ENABLE ROW LEVEL SECURITY;

-- All authenticated can view versions
CREATE POLICY "All authenticated can view guideline versions"
  ON public.guideline_versions
  FOR SELECT
  TO authenticated
  USING (true);

-- Admins and architects can insert versions
CREATE POLICY "Admins and architects can insert guideline versions"
  ON public.guideline_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'architect'::user_role)
  );

-- Create index for fast lookups
CREATE INDEX idx_guideline_versions_guideline_id ON public.guideline_versions(guideline_id);
CREATE INDEX idx_guideline_versions_intake_id ON public.guideline_versions(intake_id);
