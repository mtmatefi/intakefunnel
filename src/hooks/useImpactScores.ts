import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ImpactScore {
  id: string;
  intake_id: string;
  scored_by: string;
  business_value: number;
  time_criticality: number;
  risk_reduction: number;
  strategic_fit: number;
  effort_estimate: number;
  wsjf_score: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useImpactScore(intakeId: string | undefined) {
  return useQuery({
    queryKey: ['impact-score', intakeId],
    queryFn: async () => {
      if (!intakeId) return null;
      const { data, error } = await supabase
        .from('impact_scores')
        .select('*')
        .eq('intake_id', intakeId)
        .maybeSingle();
      if (error) throw error;
      return data as ImpactScore | null;
    },
    enabled: !!intakeId,
  });
}

export function useAllImpactScores() {
  return useQuery({
    queryKey: ['impact-scores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('impact_scores')
        .select('*');
      if (error) throw error;
      return data as ImpactScore[];
    },
  });
}

export function useUpsertImpactScore() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      intakeId: string;
      business_value: number;
      time_criticality: number;
      risk_reduction: number;
      strategic_fit: number;
      effort_estimate: number;
      notes?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Check if score exists
      const { data: existing } = await supabase
        .from('impact_scores')
        .select('id')
        .eq('intake_id', params.intakeId)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('impact_scores')
          .update({
            business_value: params.business_value,
            time_criticality: params.time_criticality,
            risk_reduction: params.risk_reduction,
            strategic_fit: params.strategic_fit,
            effort_estimate: params.effort_estimate,
            notes: params.notes || null,
            scored_by: user.id,
          })
          .eq('intake_id', params.intakeId)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('impact_scores')
          .insert({
            intake_id: params.intakeId,
            scored_by: user.id,
            business_value: params.business_value,
            time_criticality: params.time_criticality,
            risk_reduction: params.risk_reduction,
            strategic_fit: params.strategic_fit,
            effort_estimate: params.effort_estimate,
            notes: params.notes || null,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['impact-score', params.intakeId] });
      queryClient.invalidateQueries({ queryKey: ['impact-scores'] });
    },
  });
}
