import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';

export type Intake = Tables<'intakes'>;
export type Transcript = Tables<'transcripts'>;
export type SpecDocument = Tables<'spec_documents'>;
export type RoutingScore = Tables<'routing_scores'>;

export function useIntakes() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['intakes', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('intakes')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as Intake[];
    },
    enabled: !!user,
  });
}

export function useIntake(intakeId: string | undefined) {
  return useQuery({
    queryKey: ['intake', intakeId],
    queryFn: async () => {
      if (!intakeId) return null;
      
      const { data, error } = await supabase
        .from('intakes')
        .select('*')
        .eq('id', intakeId)
        .maybeSingle();

      if (error) throw error;
      return data as Intake | null;
    },
    enabled: !!intakeId,
  });
}

export function useTranscript(intakeId: string | undefined) {
  return useQuery({
    queryKey: ['transcript', intakeId],
    queryFn: async () => {
      if (!intakeId) return [];
      
      const { data, error } = await supabase
        .from('transcripts')
        .select('*')
        .eq('intake_id', intakeId)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      return data as Transcript[];
    },
    enabled: !!intakeId,
  });
}

export function useSpec(intakeId: string | undefined) {
  return useQuery({
    queryKey: ['spec', intakeId],
    queryFn: async () => {
      if (!intakeId) return null;
      
      const { data, error } = await supabase
        .from('spec_documents')
        .select('*')
        .eq('intake_id', intakeId)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as SpecDocument | null;
    },
    enabled: !!intakeId,
  });
}

export function useRoutingScore(intakeId: string | undefined) {
  return useQuery({
    queryKey: ['routing', intakeId],
    queryFn: async () => {
      if (!intakeId) return null;
      
      const { data, error } = await supabase
        .from('routing_scores')
        .select('*')
        .eq('intake_id', intakeId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as RoutingScore | null;
    },
    enabled: !!intakeId,
  });
}

export function useGenerateSpec() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (intakeId: string) => {
      const { data, error } = await supabase.functions.invoke('generate-spec', {
        body: { intakeId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, intakeId) => {
      queryClient.invalidateQueries({ queryKey: ['spec', intakeId] });
      queryClient.invalidateQueries({ queryKey: ['intake', intakeId] });
      queryClient.invalidateQueries({ queryKey: ['intakes'] });
    },
  });
}

export function useExportToJira() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (intakeId: string) => {
      const { data, error } = await supabase.functions.invoke('jira-export', {
        body: { intakeId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, intakeId) => {
      queryClient.invalidateQueries({ queryKey: ['intake', intakeId] });
      queryClient.invalidateQueries({ queryKey: ['intakes'] });
    },
  });
}

export function useUpdateIntakeStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ intakeId, status }: { intakeId: string; status: string }) => {
      const { data, error } = await supabase
        .from('intakes')
        .update({ status: status as any })
        .eq('id', intakeId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { intakeId }) => {
      queryClient.invalidateQueries({ queryKey: ['intake', intakeId] });
      queryClient.invalidateQueries({ queryKey: ['intakes'] });
    },
  });
}
