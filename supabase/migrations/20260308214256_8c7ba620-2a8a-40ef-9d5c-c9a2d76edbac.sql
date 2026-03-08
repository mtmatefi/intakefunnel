
-- Work item types
CREATE TYPE public.work_item_type AS ENUM ('epic', 'feature', 'story');

-- Hierarchical work items linked to innovations
CREATE TABLE public.innovation_work_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  innovation_id uuid NOT NULL REFERENCES public.synced_innovations(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  parent_id uuid REFERENCES public.innovation_work_items(id) ON DELETE CASCADE,
  item_type work_item_type NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo',
  assignee text,
  jira_issue_key text,
  jira_issue_url text,
  jira_status text,
  jira_exported_at timestamptz,
  source_app text NOT NULL DEFAULT 'strategy_sculptor',
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(external_id, innovation_id)
);

ALTER TABLE public.innovation_work_items ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view
CREATE POLICY "All authenticated can view work items"
  ON public.innovation_work_items FOR SELECT
  USING (true);

-- System/webhook can insert
CREATE POLICY "System can insert work items"
  ON public.innovation_work_items FOR INSERT
  WITH CHECK (true);

-- System can update (for Jira sync back)
CREATE POLICY "System can update work items"
  ON public.innovation_work_items FOR UPDATE
  USING (true);

-- Enable realtime for work items
ALTER PUBLICATION supabase_realtime ADD TABLE public.innovation_work_items;
