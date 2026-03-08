import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate sync secret
    const syncSecret = req.headers.get("x-sync-secret");
    const expectedSecret = Deno.env.get("CROSS_PROJECT_SYNC_SECRET");
    if (!syncSecret || syncSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { innovations, workspace_external_id, work_items } = body;

    if (!innovations || !Array.isArray(innovations)) {
      return new Response(JSON.stringify({ error: "innovations array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find local workspace by external_workspace_id
    let workspaceId: string | null = null;
    if (workspace_external_id) {
      const { data: ws } = await supabase
        .from("workspaces")
        .select("id")
        .eq("external_workspace_id", workspace_external_id)
        .single();
      workspaceId = ws?.id || null;
    }

    const results = [];
    for (const inn of innovations) {
      const record = {
        external_id: inn.id,
        workspace_id: workspaceId,
        title: inn.title,
        description: inn.description || null,
        hypothesis: inn.hypothesis || null,
        expected_outcome: inn.expected_outcome || null,
        value_proposition: inn.value_proposition || null,
        effort_estimate: inn.effort_estimate || null,
        learnings: inn.learnings || null,
        responsible: inn.responsible || null,
        stage: inn.stage || "discover",
        status: inn.status || "green",
        target_date: inn.target_date || null,
        product_name: inn.product_name || null,
        impact_data: inn.impact_data || [],
        trend_data: inn.trend_data || [],
        risk_data: inn.risk_data || [],
        source_app: "strategy_sculptor",
        synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("synced_innovations")
        .upsert(record, { onConflict: "external_id,source_app" })
        .select()
        .single();

      results.push({ external_id: inn.id, success: !error, error: error?.message, local_id: data?.id });
    }

    // ── Sync work items (epics/features/stories) ──
    const workItemResults = [];
    if (work_items && Array.isArray(work_items)) {
      // Build a map of external_id → innovation local id
      const innovationMap: Record<string, string> = {};
      for (const r of results) {
        if (r.local_id) innovationMap[r.external_id] = r.local_id;
      }
      // Also look up existing innovations for items referencing known external_ids
      const uniqueInnovationExternalIds = [...new Set(work_items.map((wi: any) => wi.innovation_external_id))];
      for (const extId of uniqueInnovationExternalIds) {
        if (!innovationMap[extId]) {
          const { data: existing } = await supabase
            .from("synced_innovations")
            .select("id")
            .eq("external_id", extId)
            .maybeSingle();
          if (existing) innovationMap[extId] = existing.id;
        }
      }

      // First pass: upsert all items (without parent_id to avoid FK issues)
      const externalToLocalId: Record<string, string> = {};
      for (const wi of work_items) {
        const innovationLocalId = innovationMap[wi.innovation_external_id];
        if (!innovationLocalId) {
          workItemResults.push({ external_id: wi.id, success: false, error: "Innovation not found" });
          continue;
        }

        const record = {
          innovation_id: innovationLocalId,
          external_id: wi.id,
          item_type: wi.type || "epic",
          title: wi.title,
          description: wi.description || null,
          status: wi.status || "todo",
          assignee: wi.assignee || null,
          source_app: "strategy_sculptor",
          synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from("innovation_work_items")
          .upsert(record, { onConflict: "external_id,innovation_id" })
          .select("id, external_id")
          .single();

        if (data) externalToLocalId[wi.id] = data.id;
        workItemResults.push({ external_id: wi.id, success: !error, error: error?.message });
      }

      // Second pass: set parent_id references
      for (const wi of work_items) {
        if (wi.parent_id && externalToLocalId[wi.id] && externalToLocalId[wi.parent_id]) {
          await supabase
            .from("innovation_work_items")
            .update({ parent_id: externalToLocalId[wi.parent_id] })
            .eq("id", externalToLocalId[wi.id]);
        }
      }
    }

    return new Response(JSON.stringify({
      synced: results.length,
      results,
      work_items_synced: workItemResults.length,
      work_item_results: workItemResults,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});