import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GuidelineVersion {
  id: string;
  guideline_id: string;
  version_number: number;
  changed_by: string;
  changed_at: string;
  change_reason: string;
  change_source: string;
  intake_id: string | null;
  name: string;
  description: string | null;
  content_markdown: string;
  type: string;
  compliance_framework: string | null;
  severity: string | null;
  risk_categories: string[];
  review_frequency_days: number | null;
  changed_fields: string[];
  previous_values: Record<string, any>;
}

export function useGuidelineVersions(guidelineId: string | undefined) {
  return useQuery({
    queryKey: ['guideline-versions', guidelineId],
    queryFn: async () => {
      if (!guidelineId) return [];
      const { data, error } = await supabase
        .from('guideline_versions')
        .select('*')
        .eq('guideline_id', guidelineId)
        .order('version_number', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as GuidelineVersion[];
    },
    enabled: !!guidelineId,
  });
}

export function useVersionedGuidelineUpdate() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      guidelineId,
      updates,
      changedBy,
      changeReason,
      changeSource,
      intakeId,
    }: {
      guidelineId: string;
      updates: Record<string, any>;
      changedBy: string;
      changeReason: string;
      changeSource: string;
      intakeId?: string;
    }) => {
      // 1. Fetch current guideline state
      const { data: current, error: fetchErr } = await supabase
        .from('guidelines')
        .select('*')
        .eq('id', guidelineId)
        .single();
      if (fetchErr) throw fetchErr;

      // 2. Calculate changed fields and previous values
      const changedFields: string[] = [];
      const previousValues: Record<string, any> = {};
      for (const [key, val] of Object.entries(updates)) {
        if (val !== null && val !== undefined && JSON.stringify((current as any)[key]) !== JSON.stringify(val)) {
          changedFields.push(key);
          previousValues[key] = (current as any)[key];
        }
      }

      // 3. Get next version number
      const { data: versions } = await supabase
        .from('guideline_versions')
        .select('version_number')
        .eq('guideline_id', guidelineId)
        .order('version_number', { ascending: false })
        .limit(1);

      const nextVersion = (versions?.[0]?.version_number || 0) + 1;

      // 4. Insert version snapshot
      const { error: versionErr } = await supabase
        .from('guideline_versions')
        .insert({
          guideline_id: guidelineId,
          version_number: nextVersion,
          changed_by: changedBy,
          change_reason: changeReason,
          change_source: changeSource,
          intake_id: intakeId || null,
          name: (updates.name as string) || current.name,
          description: updates.description !== undefined ? updates.description : current.description,
          content_markdown: (updates.content_markdown as string) || current.content_markdown,
          type: (updates.type as string) || current.type,
          compliance_framework: updates.compliance_framework || current.compliance_framework,
          severity: updates.severity || current.severity,
          risk_categories: updates.risk_categories || current.risk_categories,
          review_frequency_days: updates.review_frequency_days || current.review_frequency_days,
          changed_fields: changedFields,
          previous_values: previousValues,
        } as any);
      if (versionErr) throw versionErr;

      // 5. Apply the update to the guideline
      const { data: updated, error: updateErr } = await supabase
        .from('guidelines')
        .update(updates as any)
        .eq('id', guidelineId)
        .select()
        .single();
      if (updateErr) throw updateErr;

      return { guideline: updated, version: nextVersion, changedFields };
    },
    onSuccess: (_, { guidelineId }) => {
      qc.invalidateQueries({ queryKey: ['guidelines'] });
      qc.invalidateQueries({ queryKey: ['guideline-versions', guidelineId] });
    },
  });
}
