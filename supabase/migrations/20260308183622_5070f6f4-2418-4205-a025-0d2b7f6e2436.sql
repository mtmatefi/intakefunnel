
-- Fix overly permissive workspace INSERT policy
DROP POLICY "Authenticated can create workspaces" ON public.workspaces;
CREATE POLICY "Authenticated can create workspaces" ON public.workspaces FOR INSERT WITH CHECK (auth.uid() = created_by);
