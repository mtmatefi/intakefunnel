import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SyncedInnovation {
  id: string;
  external_id: string;
  workspace_id: string | null;
  title: string;
  description: string | null;
  hypothesis: string | null;
  expected_outcome: string | null;
  value_proposition: string | null;
  effort_estimate: string | null;
  learnings: string | null;
  responsible: string | null;
  stage: string;
  status: string | null;
  target_date: string | null;
  product_name: string | null;
  impact_data: any[];
  trend_data: any[];
  risk_data: any[];
  source_app: string;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface InnovationFeedback {
  id: string;
  innovation_id: string;
  user_id: string;
  comment: string;
  feedback_type: string;
  created_at: string;
  updated_at: string;
}

export function useInnovations(workspaceId?: string) {
  return useQuery({
    queryKey: ['synced-innovations', workspaceId],
    queryFn: async () => {
      let query = supabase
        .from('synced_innovations' as any)
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as SyncedInnovation[];
    },
  });
}

export function useInnovationFeedback(innovationId?: string) {
  return useQuery({
    queryKey: ['innovation-feedback', innovationId],
    queryFn: async () => {
      if (!innovationId) return [];
      const { data, error } = await supabase
        .from('innovation_feedback' as any)
        .select('*')
        .eq('innovation_id', innovationId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as InnovationFeedback[];
    },
    enabled: !!innovationId,
  });
}

export function useAddInnovationFeedback() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ innovationId, comment, feedbackType = 'comment' }: {
      innovationId: string;
      comment: string;
      feedbackType?: string;
    }) => {
      const { data, error } = await supabase
        .from('innovation_feedback' as any)
        .insert({
          innovation_id: innovationId,
          user_id: user?.id,
          comment,
          feedback_type: feedbackType,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['innovation-feedback', variables.innovationId] });
    },
  });
}
