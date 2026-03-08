import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WorkItem {
  id: string;
  innovation_id: string;
  external_id: string;
  parent_id: string | null;
  item_type: 'epic' | 'feature' | 'story';
  title: string;
  description: string | null;
  acceptance_criteria: string[] | null;
  functional_requirements: string[] | null;
  non_functional_requirements: string[] | null;
  priority: string | null;
  story_points: number | null;
  definition_of_done: string | null;
  status: string;
  assignee: string | null;
  jira_issue_key: string | null;
  jira_issue_url: string | null;
  jira_status: string | null;
  jira_exported_at: string | null;
  source_app: string;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface WorkItemTree extends WorkItem {
  children: WorkItemTree[];
}

function buildTree(items: WorkItem[]): WorkItemTree[] {
  const map: Record<string, WorkItemTree> = {};
  const roots: WorkItemTree[] = [];

  for (const item of items) {
    map[item.id] = { ...item, children: [] };
  }

  for (const item of items) {
    const node = map[item.id];
    if (item.parent_id && map[item.parent_id]) {
      map[item.parent_id].children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export function useWorkItems(innovationId?: string) {
  return useQuery({
    queryKey: ['work-items', innovationId],
    queryFn: async () => {
      if (!innovationId) return [];
      const { data, error } = await supabase
        .from('innovation_work_items' as any)
        .select('*')
        .eq('innovation_id', innovationId)
        .order('item_type', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as WorkItem[];
    },
    enabled: !!innovationId,
  });
}

export function useWorkItemTree(innovationId?: string) {
  const { data: items = [], ...rest } = useWorkItems(innovationId);
  return { tree: buildTree(items), items, ...rest };
}

export function useExportWorkItemsToJira() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ innovationId, projectKey }: { innovationId: string; projectKey: string }) => {
      const { data, error } = await supabase.functions.invoke('export-work-items', {
        body: { innovation_id: innovationId, project_key: projectKey },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['work-items', variables.innovationId] });
    },
  });
}

export function useTranslateWorkItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workItemIds, innovationId, targetLanguage = 'en' }: { 
      workItemIds: string[]; 
      innovationId: string;
      targetLanguage?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('translate-work-items', {
        body: { workItemIds, targetLanguage },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['work-items', variables.innovationId] });
    },
  });
}

export function usePublishDeliveryPackage() {
  return useMutation({
    mutationFn: async ({ innovationId }: { innovationId: string }) => {
      const { data, error } = await supabase.functions.invoke('publish-delivery-package', {
        body: { innovationId },
      });
      if (error) throw error;
      return data;
    },
  });
}
