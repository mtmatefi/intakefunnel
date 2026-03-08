-- Allow admins to see all workspaces
DROP POLICY IF EXISTS "Members can view workspaces" ON public.workspaces;
CREATE POLICY "Members and admins can view workspaces"
  ON public.workspaces FOR SELECT
  TO authenticated
  USING (
    is_workspace_member(auth.uid(), id) 
    OR has_role(auth.uid(), 'admin'::user_role)
  );

-- Allow admins to update any workspace
DROP POLICY IF EXISTS "Owners can update workspaces" ON public.workspaces;
CREATE POLICY "Owners and admins can update workspaces"
  ON public.workspaces FOR UPDATE
  TO authenticated
  USING (
    is_workspace_member(auth.uid(), id) 
    OR has_role(auth.uid(), 'admin'::user_role)
  );