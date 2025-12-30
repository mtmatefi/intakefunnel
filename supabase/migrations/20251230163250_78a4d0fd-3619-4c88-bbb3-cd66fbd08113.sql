-- Spec amendments table for tracking changes by architects/admins
CREATE TABLE public.spec_amendments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  spec_id UUID NOT NULL REFERENCES public.spec_documents(id) ON DELETE CASCADE,
  intake_id UUID NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  amended_by UUID NOT NULL,
  amendment_type TEXT NOT NULL, -- 'addition', 'modification', 'clarification'
  field_name TEXT, -- which field was amended
  original_value TEXT,
  new_value TEXT,
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.spec_amendments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view amendments for accessible intakes"
ON public.spec_amendments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM intakes
    WHERE intakes.id = spec_amendments.intake_id
    AND (
      intakes.requester_id = auth.uid()
      OR has_role(auth.uid(), 'architect')
      OR has_role(auth.uid(), 'admin')
    )
  )
);

CREATE POLICY "Architects and admins can insert amendments"
ON public.spec_amendments
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'architect') OR has_role(auth.uid(), 'admin')
);

-- Add impersonated_role to store temporary role for admins
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'de';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_theme TEXT DEFAULT 'system';

-- Add jpd_issue_id to intakes for linking to Jira Product Discovery
ALTER TABLE public.intakes ADD COLUMN IF NOT EXISTS jpd_issue_key TEXT;