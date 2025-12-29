-- Create enum types
CREATE TYPE public.user_role AS ENUM ('requester', 'architect', 'engineer_lead', 'admin');
CREATE TYPE public.intake_status AS ENUM ('draft', 'gathering_info', 'spec_generated', 'pending_approval', 'approved', 'rejected', 'exported', 'closed');
CREATE TYPE public.delivery_path AS ENUM ('BUY', 'CONFIG', 'AI_DISPOSABLE', 'PRODUCT_GRADE', 'CRITICAL');
CREATE TYPE public.data_classification AS ENUM ('public', 'internal', 'confidential', 'restricted');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'requester',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create intakes table
CREATE TABLE public.intakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  status intake_status NOT NULL DEFAULT 'draft',
  requester_id UUID NOT NULL REFERENCES auth.users(id),
  value_stream TEXT,
  category TEXT,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create transcripts table
CREATE TABLE public.transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id UUID NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  speaker TEXT NOT NULL CHECK (speaker IN ('user', 'assistant', 'system')),
  message TEXT NOT NULL,
  question_key TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw_payload JSONB
);

-- Create spec_documents table
CREATE TABLE public.spec_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id UUID NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  structured_json JSONB NOT NULL,
  markdown TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create routing_scores table
CREATE TABLE public.routing_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id UUID NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  path delivery_path NOT NULL,
  score INTEGER NOT NULL,
  score_json JSONB NOT NULL,
  explanation_markdown TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create approvals table
CREATE TABLE public.approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id UUID NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  architect_id UUID NOT NULL REFERENCES auth.users(id),
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected', 'needs_revision')),
  guardrails_json JSONB,
  comments TEXT,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create jira_exports table
CREATE TABLE public.jira_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id UUID NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  jpd_issue_key TEXT,
  epic_key TEXT,
  jsm_request_key TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'success', 'failed')),
  logs TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spec_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routing_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jira_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user's highest role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY CASE role 
    WHEN 'admin' THEN 1 
    WHEN 'architect' THEN 2 
    WHEN 'engineer_lead' THEN 3 
    WHEN 'requester' THEN 4 
  END
  LIMIT 1
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for intakes
CREATE POLICY "Requesters can view own intakes" ON public.intakes
  FOR SELECT TO authenticated USING (
    requester_id = auth.uid() OR
    public.has_role(auth.uid(), 'architect') OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can create intakes" ON public.intakes
  FOR INSERT TO authenticated WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Users can update own intakes" ON public.intakes
  FOR UPDATE TO authenticated USING (
    requester_id = auth.uid() OR
    public.has_role(auth.uid(), 'architect') OR
    public.has_role(auth.uid(), 'admin')
  );

-- RLS Policies for transcripts
CREATE POLICY "Users can view transcripts for accessible intakes" ON public.transcripts
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.intakes 
      WHERE intakes.id = intake_id AND (
        intakes.requester_id = auth.uid() OR
        public.has_role(auth.uid(), 'architect') OR
        public.has_role(auth.uid(), 'admin')
      )
    )
  );

CREATE POLICY "Users can insert transcripts for own intakes" ON public.transcripts
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.intakes 
      WHERE intakes.id = intake_id AND intakes.requester_id = auth.uid()
    )
  );

-- RLS Policies for spec_documents
CREATE POLICY "Users can view specs for accessible intakes" ON public.spec_documents
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.intakes 
      WHERE intakes.id = intake_id AND (
        intakes.requester_id = auth.uid() OR
        public.has_role(auth.uid(), 'architect') OR
        public.has_role(auth.uid(), 'admin')
      )
    )
  );

CREATE POLICY "Users can insert specs" ON public.spec_documents
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

-- RLS Policies for routing_scores
CREATE POLICY "Users can view routing for accessible intakes" ON public.routing_scores
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.intakes 
      WHERE intakes.id = intake_id AND (
        intakes.requester_id = auth.uid() OR
        public.has_role(auth.uid(), 'architect') OR
        public.has_role(auth.uid(), 'admin')
      )
    )
  );

CREATE POLICY "System can insert routing scores" ON public.routing_scores
  FOR INSERT TO authenticated WITH CHECK (true);

-- RLS Policies for approvals
CREATE POLICY "Users can view approvals for accessible intakes" ON public.approvals
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.intakes 
      WHERE intakes.id = intake_id AND (
        intakes.requester_id = auth.uid() OR
        public.has_role(auth.uid(), 'architect') OR
        public.has_role(auth.uid(), 'admin')
      )
    )
  );

CREATE POLICY "Architects can create approvals" ON public.approvals
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'architect') OR
    public.has_role(auth.uid(), 'admin')
  );

-- RLS Policies for jira_exports
CREATE POLICY "Users can view exports for accessible intakes" ON public.jira_exports
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.intakes 
      WHERE intakes.id = intake_id AND (
        intakes.requester_id = auth.uid() OR
        public.has_role(auth.uid(), 'architect') OR
        public.has_role(auth.uid(), 'admin')
      )
    )
  );

CREATE POLICY "Architects can manage exports" ON public.jira_exports
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'architect') OR
    public.has_role(auth.uid(), 'admin')
  );

-- RLS Policies for audit_logs
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  
  -- Assign default role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'requester');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_intakes_updated_at
  BEFORE UPDATE ON public.intakes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_jira_exports_updated_at
  BEFORE UPDATE ON public.jira_exports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();