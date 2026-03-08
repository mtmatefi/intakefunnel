import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Approval {
  id: string;
  intake_id: string;
  architect_id: string;
  decision: string;
  guardrails_json: any;
  comments: string | null;
  decided_at: string;
}

export function useApproval(intakeId: string | undefined) {
  return useQuery({
    queryKey: ['approval', intakeId],
    queryFn: async () => {
      if (!intakeId) return null;
      const { data, error } = await supabase
        .from('approvals')
        .select('*')
        .eq('intake_id', intakeId)
        .order('decided_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Approval | null;
    },
    enabled: !!intakeId,
  });
}

export function useCreateApproval() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      intakeId: string;
      decision: 'approved' | 'rejected' | 'needs_revision';
      comments?: string;
      guardrails?: any;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('approvals')
        .insert({
          intake_id: params.intakeId,
          architect_id: user.id,
          decision: params.decision,
          comments: params.comments || null,
          guardrails_json: params.guardrails || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Update intake status
      const statusMap: Record<string, string> = {
        approved: 'approved',
        rejected: 'rejected',
        needs_revision: 'gathering_info',
      };

      await supabase
        .from('intakes')
        .update({ status: statusMap[params.decision] as any })
        .eq('id', params.intakeId);

      // Log to audit
      await supabase.from('audit_logs').insert({
        actor_id: user.id,
        action: params.decision === 'approved' ? 'APPROVE' : params.decision === 'rejected' ? 'REJECT' : 'REQUEST_REVISION',
        entity_type: 'intake',
        entity_id: params.intakeId,
        metadata_json: { decision: params.decision, comments: params.comments },
      });

      return data;
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['approval', params.intakeId] });
      queryClient.invalidateQueries({ queryKey: ['intake', params.intakeId] });
      queryClient.invalidateQueries({ queryKey: ['intakes'] });
    },
  });
}
