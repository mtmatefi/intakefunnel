-- Add workspace status for soft-delete and active/inactive management
ALTER TABLE public.workspaces 
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- Allow admins and owners to delete workspaces (soft delete)
CREATE POLICY "Owners and admins can delete workspaces"
  ON public.workspaces FOR DELETE
  TO authenticated
  USING (
    is_workspace_member(auth.uid(), id) 
    OR has_role(auth.uid(), 'admin'::user_role)
  );