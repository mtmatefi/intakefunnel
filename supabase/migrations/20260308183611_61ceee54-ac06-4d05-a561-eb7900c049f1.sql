
-- 1. WORKSPACES TABLE
CREATE TABLE public.workspaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- 2. WORKSPACE MEMBERS TABLE
CREATE TABLE public.workspace_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- 3. Helper: check workspace membership
CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id UUID, _workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members WHERE user_id = _user_id AND workspace_id = _workspace_id
  )
$$;

-- 4. Atomic workspace creation (creates workspace + adds owner)
CREATE OR REPLACE FUNCTION public.create_workspace_with_owner(
  _name text,
  _description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ws_id uuid;
BEGIN
  INSERT INTO public.workspaces (name, description)
  VALUES (_name, _description)
  RETURNING id INTO _ws_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (_ws_id, auth.uid(), 'owner');

  RETURN _ws_id;
END;
$$;

-- 5. RLS for workspaces
CREATE POLICY "Members can view workspaces" ON public.workspaces FOR SELECT USING (public.is_workspace_member(auth.uid(), id));
CREATE POLICY "Authenticated can create workspaces" ON public.workspaces FOR INSERT WITH CHECK (true);
CREATE POLICY "Owners can update workspaces" ON public.workspaces FOR UPDATE USING (public.is_workspace_member(auth.uid(), id));

-- 6. RLS for workspace_members
CREATE POLICY "Members can view workspace members" ON public.workspace_members FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Can join workspaces" ON public.workspace_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can manage members" ON public.workspace_members FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = workspace_members.workspace_id AND wm.user_id = auth.uid() AND wm.role = 'owner')
);
CREATE POLICY "Owners can delete members" ON public.workspace_members FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = workspace_members.workspace_id AND wm.user_id = auth.uid() AND wm.role = 'owner')
);

-- 7. Add workspace_id to intakes
ALTER TABLE public.intakes ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- 8. Add workspace_id to guidelines
ALTER TABLE public.guidelines ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- 9. Updated_at trigger for workspaces
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
