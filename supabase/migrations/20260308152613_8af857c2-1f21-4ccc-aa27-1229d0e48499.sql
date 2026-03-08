
-- Impact/Value scoring table for WSJF prioritization
CREATE TABLE public.impact_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intake_id UUID NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  scored_by UUID NOT NULL,
  business_value INTEGER NOT NULL DEFAULT 0 CHECK (business_value >= 0 AND business_value <= 100),
  time_criticality INTEGER NOT NULL DEFAULT 0 CHECK (time_criticality >= 0 AND time_criticality <= 100),
  risk_reduction INTEGER NOT NULL DEFAULT 0 CHECK (risk_reduction >= 0 AND risk_reduction <= 100),
  strategic_fit INTEGER NOT NULL DEFAULT 0 CHECK (strategic_fit >= 0 AND strategic_fit <= 100),
  effort_estimate INTEGER NOT NULL DEFAULT 1 CHECK (effort_estimate >= 1 AND effort_estimate <= 100),
  wsjf_score NUMERIC GENERATED ALWAYS AS (
    CASE WHEN effort_estimate > 0 
      THEN ROUND(((business_value + time_criticality + risk_reduction + strategic_fit)::numeric / effort_estimate), 2)
      ELSE 0 
    END
  ) STORED,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(intake_id)
);

-- Enable RLS
ALTER TABLE public.impact_scores ENABLE ROW LEVEL SECURITY;

-- Architects and admins can manage impact scores
CREATE POLICY "Architects and admins can manage impact scores"
  ON public.impact_scores
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'architect'::user_role) OR has_role(auth.uid(), 'admin'::user_role));

-- Requesters can view scores for their intakes
CREATE POLICY "Users can view impact scores for accessible intakes"
  ON public.impact_scores
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM intakes
    WHERE intakes.id = impact_scores.intake_id
    AND (intakes.requester_id = auth.uid() OR has_role(auth.uid(), 'architect'::user_role) OR has_role(auth.uid(), 'admin'::user_role))
  ));

-- Add trigger for updated_at
CREATE TRIGGER update_impact_scores_updated_at
  BEFORE UPDATE ON public.impact_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
