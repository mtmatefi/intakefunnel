import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UnreadCount {
  innovationId: string;
  unreadCount: number;
}

export function useUnreadFeedback() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Track which innovations are completely new (never opened)
  const { data: newInnovationIds = [] } = useQuery({
    queryKey: ['new-innovations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get all innovation IDs
      const { data: allInnovations, error: innErr } = await supabase
        .from('synced_innovations')
        .select('id');
      if (innErr) throw innErr;

      // Get user's read records
      const { data: reads, error: readErr } = await supabase
        .from('innovation_feedback_reads' as any)
        .select('innovation_id')
        .eq('user_id', user.id);
      if (readErr) throw readErr;

      const readSet = new Set((reads || []).map((r: any) => r.innovation_id));
      return (allInnovations || [])
        .filter((inn) => !readSet.has(inn.id))
        .map((inn) => inn.id);
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  const { data: unreadCounts = [], ...rest } = useQuery({
    queryKey: ['unread-feedback', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get all feedback grouped by innovation
      const { data: allFeedback, error: fbErr } = await supabase
        .from('innovation_feedback' as any)
        .select('innovation_id, created_at')
        .order('created_at', { ascending: false });
      if (fbErr) throw fbErr;

      // Get user's read timestamps
      const { data: reads, error: readErr } = await supabase
        .from('innovation_feedback_reads' as any)
        .select('innovation_id, last_read_at')
        .eq('user_id', user.id);
      if (readErr) throw readErr;

      const readMap: Record<string, string> = {};
      for (const r of (reads || []) as any[]) {
        readMap[r.innovation_id] = r.last_read_at;
      }

      // Count unread per innovation
      const countMap: Record<string, number> = {};
      for (const fb of (allFeedback || []) as any[]) {
        const lastRead = readMap[fb.innovation_id];
        if (!lastRead || new Date(fb.created_at) > new Date(lastRead)) {
          countMap[fb.innovation_id] = (countMap[fb.innovation_id] || 0) + 1;
        }
      }

      return Object.entries(countMap).map(([innovationId, unreadCount]) => ({
        innovationId,
        unreadCount,
      })) as UnreadCount[];
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  const totalUnread = unreadCounts.reduce((sum, c) => sum + c.unreadCount, 0) + newInnovationIds.length;

  const getUnreadForInnovation = (innovationId: string) =>
    unreadCounts.find(c => c.innovationId === innovationId)?.unreadCount || 0;

  const isNewInnovation = (innovationId: string) =>
    newInnovationIds.includes(innovationId);

  const markAsRead = useMutation({
    mutationFn: async (innovationId: string) => {
      if (!user?.id) return;
      const { error } = await supabase
        .from('innovation_feedback_reads' as any)
        .upsert(
          { user_id: user.id, innovation_id: innovationId, last_read_at: new Date().toISOString() },
          { onConflict: 'user_id,innovation_id' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unread-feedback'] });
      queryClient.invalidateQueries({ queryKey: ['new-innovations'] });
    },
  });

  return {
    unreadCounts,
    totalUnread,
    getUnreadForInnovation,
    markAsRead,
    ...rest,
  };
}
