
CREATE TABLE public.interview_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL DEFAULT 'general',
  content_markdown TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.interview_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view active interview rules"
  ON public.interview_rules FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Architects and admins can manage interview rules"
  ON public.interview_rules FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'architect'::user_role));

CREATE TRIGGER update_interview_rules_updated_at
  BEFORE UPDATE ON public.interview_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
