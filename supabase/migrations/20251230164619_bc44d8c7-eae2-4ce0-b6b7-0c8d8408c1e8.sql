-- Interview Topics Configuration for Admins/Architects
CREATE TABLE public.interview_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  is_required BOOLEAN NOT NULL DEFAULT false,
  sample_questions TEXT[],
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Security & Architecture Guidelines
CREATE TABLE public.guidelines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('security', 'architecture', 'compliance')),
  name TEXT NOT NULL,
  description TEXT,
  content_markdown TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Follow-up Requests from Architects
CREATE TABLE public.followup_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intake_id UUID NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]',
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'answered', 'cancelled')),
  answered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.interview_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guidelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followup_requests ENABLE ROW LEVEL SECURITY;

-- Policies for interview_topics
CREATE POLICY "All authenticated can view interview topics"
ON public.interview_topics FOR SELECT
USING (true);

CREATE POLICY "Architects and admins can manage interview topics"
ON public.interview_topics FOR ALL
USING (has_role(auth.uid(), 'architect'::user_role) OR has_role(auth.uid(), 'admin'::user_role));

-- Policies for guidelines
CREATE POLICY "All authenticated can view active guidelines"
ON public.guidelines FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage guidelines"
ON public.guidelines FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));

-- Policies for followup_requests
CREATE POLICY "Users can view their own followup requests"
ON public.followup_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM intakes
    WHERE intakes.id = followup_requests.intake_id
    AND (intakes.requester_id = auth.uid() OR has_role(auth.uid(), 'architect'::user_role) OR has_role(auth.uid(), 'admin'::user_role))
  )
);

CREATE POLICY "Architects and admins can create followup requests"
ON public.followup_requests FOR INSERT
WITH CHECK (has_role(auth.uid(), 'architect'::user_role) OR has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Requesters can update their followup requests"
ON public.followup_requests FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM intakes
    WHERE intakes.id = followup_requests.intake_id
    AND intakes.requester_id = auth.uid()
  )
);

-- Insert default security topics
INSERT INTO public.interview_topics (name, description, category, is_required, sample_questions, created_by)
VALUES 
  ('Non-Functional Requirements', 'Availability, Performance, Security basics', 'nfr', true, 
   ARRAY['Welche Verfügbarkeitsanforderungen gibt es?', 'Wie schnell muss das System reagieren?', 'Gibt es Auditierungsanforderungen?'],
   (SELECT user_id FROM public.user_roles WHERE role = 'admin' LIMIT 1)),
  ('Data Classification', 'Determine data sensitivity level', 'security', true,
   ARRAY['Welche Arten von Daten werden verarbeitet?', 'Gibt es personenbezogene Daten?', 'Wie ist die Datenklassifizierung?'],
   (SELECT user_id FROM public.user_roles WHERE role = 'admin' LIMIT 1)),
  ('Integration Points', 'Systems to connect with', 'architecture', false,
   ARRAY['Mit welchen Systemen muss integriert werden?', 'Welche APIs werden benötigt?'],
   (SELECT user_id FROM public.user_roles WHERE role = 'admin' LIMIT 1));

-- Insert default guidelines
INSERT INTO public.guidelines (type, name, description, content_markdown, created_by)
VALUES
  ('security', 'OWASP Top 10', 'Web Application Security Risks', '## OWASP Top 10 Guidelines\n\n- A01:2021 – Broken Access Control\n- A02:2021 – Cryptographic Failures\n- A03:2021 – Injection\n- A04:2021 – Insecure Design\n- A05:2021 – Security Misconfiguration\n- A06:2021 – Vulnerable Components\n- A07:2021 – Authentication Failures\n- A08:2021 – Software and Data Integrity\n- A09:2021 – Logging Failures\n- A10:2021 – SSRF',
   (SELECT user_id FROM public.user_roles WHERE role = 'admin' LIMIT 1)),
  ('architecture', 'Enterprise Architecture', 'EA Guidelines für Systemdesign', '## Enterprise Architecture Guidelines\n\n- Bevorzuge wiederverwendbare Komponenten\n- Dokumentiere alle Schnittstellen\n- Halte Abhängigkeiten minimal\n- LeanIX Integration für Systemlandschaft (geplant)',
   (SELECT user_id FROM public.user_roles WHERE role = 'admin' LIMIT 1));