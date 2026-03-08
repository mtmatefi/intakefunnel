import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AuditLogEntry {
  id: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata_json: any;
  created_at: string;
  profile?: { display_name: string } | null;
}

export function useAuditLogs(limit = 100) {
  return useQuery({
    queryKey: ['audit-logs', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`*, profiles:actor_id(display_name)`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as AuditLogEntry[];
    },
  });
}

export function useIntakeAuditLogs(intakeId: string | undefined) {
  return useQuery({
    queryKey: ['audit-logs', 'intake', intakeId],
    queryFn: async () => {
      if (!intakeId) return [];
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`*, profiles:actor_id(display_name)`)
        .eq('entity_id', intakeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AuditLogEntry[];
    },
    enabled: !!intakeId,
  });
}
