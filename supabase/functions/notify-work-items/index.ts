import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Sends a lightweight push notification to Strategy Sculptor whenever
 * work items for an innovation are created, updated, or translated.
 * 
 * The Sculptor can then pull the full data via GET /get-work-items.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { innovationId, event, summary } = await req.json();
    if (!innovationId) {
      return new Response(JSON.stringify({ error: "innovationId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sculptorUrl = Deno.env.get("SCULPTOR_SUPABASE_URL");
    const syncSecret = Deno.env.get("CROSS_PROJECT_SYNC_SECRET");

    if (!sculptorUrl || !syncSecret) {
      return new Response(JSON.stringify({ skipped: true, reason: "Sculptor not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch innovation to get external_id
    const { data: innovation } = await db
      .from("synced_innovations")
      .select("external_id, title")
      .eq("id", innovationId)
      .single();

    if (!innovation) {
      return new Response(JSON.stringify({ error: "Innovation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch quick stats
    const { data: items } = await db
      .from("innovation_work_items")
      .select("item_type, story_points, status")
      .eq("innovation_id", innovationId);

    const stats = {
      total: (items || []).length,
      epics: (items || []).filter((i: any) => i.item_type === "epic").length,
      features: (items || []).filter((i: any) => i.item_type === "feature").length,
      stories: (items || []).filter((i: any) => i.item_type === "story").length,
      total_story_points: (items || []).reduce((s: number, i: any) => s + (i.story_points || 0), 0),
    };

    const intakeFunnelUrl = Deno.env.get("SUPABASE_URL")!;

    const payload = {
      event: event || "work_items_updated",
      innovation_external_id: innovation.external_id,
      innovation_title: innovation.title,
      timestamp: new Date().toISOString(),
      summary: summary || `Work Items aktualisiert: ${stats.epics}E/${stats.features}F/${stats.stories}S (${stats.total_story_points} SP)`,
      stats,
      pull_url: `${intakeFunnelUrl}/functions/v1/get-work-items?innovation_id=${innovationId}`,
      pull_url_by_external: `${intakeFunnelUrl}/functions/v1/get-work-items?external_id=${innovation.external_id}`,
    };

    const resp = await fetch(`${sculptorUrl}/functions/v1/receive-feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-sync-secret": syncSecret,
      },
      body: JSON.stringify(payload),
    });

    return new Response(JSON.stringify({
      success: resp.ok,
      sculptor_status: resp.status,
      payload_sent: payload,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-work-items error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
