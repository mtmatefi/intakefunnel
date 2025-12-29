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

export function useCreateIntake() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ title, valueStream, category }: { 
      title: string; 
      valueStream?: string; 
      category?: string;
    }) => {
      if (!user) throw new Error('User must be logged in');
      
      const { data, error } = await supabase
        .from('intakes')
        .insert({
          title,
          requester_id: user.id,
          value_stream: valueStream || null,
          category: category || null,
          status: 'gathering_info',
        })
        .select()
        .single();

      if (error) throw error;
      return data as Intake;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intakes'] });
    },
  });
}

export function useSaveTranscript() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ intakeId, messages }: { 
      intakeId: string; 
      messages: Array<{
        speaker: string;
        message: string;
        questionKey?: string;
        timestamp: string;
      }>;
    }) => {
      const transcriptRows = messages.map(msg => ({
        intake_id: intakeId,
        speaker: msg.speaker,
        message: msg.message,
        question_key: msg.questionKey || null,
        timestamp: msg.timestamp,
      }));

      const { error } = await supabase
        .from('transcripts')
        .insert(transcriptRows);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: (_, { intakeId }) => {
      queryClient.invalidateQueries({ queryKey: ['transcript', intakeId] });
    },
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
      // First fetch the spec and routing data
      const { data: spec } = await supabase
        .from('spec_documents')
        .select('structured_json')
        .eq('intake_id', intakeId)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: routing } = await supabase
        .from('routing_scores')
        .select('*')
        .eq('intake_id', intakeId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!spec) throw new Error('No specification found for this intake');
      
      const specJson = spec.structured_json as any;
      
      const { data, error } = await supabase.functions.invoke('jira-export', {
        body: { 
          intakeId,
          spec: {
            problemStatement: specJson.problemStatement || '',
            goals: specJson.goals || [],
            users: specJson.users || [],
            acceptanceCriteria: specJson.acceptanceCriteria || [],
            risks: specJson.risks || [],
            nfrs: specJson.nfrs || {},
          },
          routing: routing ? {
            path: routing.path,
            score: routing.score,
            explanation: routing.explanation_markdown || '',
          } : {
            path: 'PRODUCT_GRADE',
            score: 50,
            explanation: 'Default routing',
          },
          projectKeys: {
            softwareProject: 'INTAKE', // Default project key
          },
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      // Update intake status to exported
      await supabase
        .from('intakes')
        .update({ status: 'exported' })
        .eq('id', intakeId);
      
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
