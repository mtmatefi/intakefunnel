import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InitiativeLink {
  id: string;
  tenant_id: string;
  initiative_id: string;
  initiative_title: string;
  initiative_data: Record<string, any>;
  intake_id: string | null;
  source_app: string;
  sync_status: string;
  last_synced_at: string;
  created_at: string;
}

export function useInitiativeLinks(intakeId?: string) {
  return useQuery({
    queryKey: ['initiative-links', intakeId],
    queryFn: async () => {
      if (!intakeId) return [];
      const { data, error } = await supabase
        .from('initiative_intake_links' as any)
        .select('*')
        .eq('intake_id', intakeId);
      if (error) throw error;
      return (data || []) as unknown as InitiativeLink[];
    },
    enabled: !!intakeId,
  });
}

export function useAllInitiativeLinks() {
  return useQuery({
    queryKey: ['initiative-links-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('initiative_intake_links' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as InitiativeLink[];
    },
  });
}
