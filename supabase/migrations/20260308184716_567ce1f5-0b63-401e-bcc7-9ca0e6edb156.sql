
-- Add external workspace ID for cross-project sync
ALTER TABLE public.workspaces ADD COLUMN external_workspace_id UUID;
ALTER TABLE public.workspaces ADD COLUMN external_source TEXT;

-- Index for fast lookup by external ID
CREATE INDEX idx_workspaces_external_id ON public.workspaces(external_workspace_id) WHERE external_workspace_id IS NOT NULL;
