import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Guideline {
  id: string;
  type: string;
  name: string;
  description: string | null;
  content_markdown: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  compliance_framework: string;
  severity: string;
  risk_categories: string[];
  linked_initiative_ids: string[];
  applicability_conditions: Record<string, any>;
  review_frequency_days: number;
  last_reviewed_at: string | null;
  reviewed_by: string | null;
}

export type GuidelineInsert = {
  type: string;
  name: string;
  description?: string;
  content_markdown: string;
  is_active?: boolean;
  created_by: string;
  compliance_framework?: string;
  severity?: string;
  risk_categories?: string[];
  linked_initiative_ids?: string[];
  applicability_conditions?: Record<string, any>;
  review_frequency_days?: number;
};

export function useGuidelines(framework?: string) {
  return useQuery({
    queryKey: ['guidelines', framework],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guidelines')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      let results = (data || []) as unknown as Guideline[];
      if (framework && framework !== 'all') {
        results = results.filter((g) => g.compliance_framework === framework);
      }
      if (error) throw error;
      return (data || []) as unknown as Guideline[];
    },
  });
}

export function useCreateGuideline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (guideline: GuidelineInsert) => {
      const { data, error } = await supabase
        .from('guidelines')
        .insert(guideline as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Guideline;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guidelines'] }),
  });
}

export function useUpdateGuideline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Guideline> & { id: string }) => {
      const { data, error } = await supabase
        .from('guidelines')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Guideline;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guidelines'] }),
  });
}

export function useDeleteGuideline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('guidelines')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guidelines'] }),
  });
}
