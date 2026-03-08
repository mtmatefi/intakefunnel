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
    // Validate caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { workspace_id } = body;

    if (!workspace_id) {
      return new Response(JSON.stringify({ error: "workspace_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the workspace to find the external_workspace_id (Sculptor's workspace ID)
    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: ws, error: wsError } = await serviceSupabase
      .from("workspaces")
      .select("external_workspace_id, external_source")
      .eq("id", workspace_id)
      .single();

    if (wsError || !ws?.external_workspace_id) {
      return new Response(JSON.stringify({ error: "Workspace not linked to Sculptor", details: wsError?.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Sculptor's export-innovations endpoint
    const sculptorUrl = Deno.env.get("SCULPTOR_SUPABASE_URL");
    const syncSecret = Deno.env.get("CROSS_PROJECT_SYNC_SECRET");

    if (!sculptorUrl || !syncSecret) {
      return new Response(JSON.stringify({ error: "Sculptor connection not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedUrl = sculptorUrl.replace(/\/$/, "");
    const exportUrl = normalizedUrl.includes("/functions/v1")
      ? `${normalizedUrl}/export-innovations`
      : `${normalizedUrl}/functions/v1/export-innovations`;

    console.log(`Fetching innovations from Sculptor: ${exportUrl} for workspace ${ws.external_workspace_id}`);

    const sculptorResp = await fetch(exportUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-sync-secret": syncSecret,
      },
      body: JSON.stringify({
        workspace_id: ws.external_workspace_id,
      }),
    });

    if (!sculptorResp.ok) {
      const errText = await sculptorResp.text().catch(() => "Unknown error");
      console.error(`Sculptor export failed (${sculptorResp.status}):`, errText);
      return new Response(JSON.stringify({ 
        error: "Failed to fetch from Sculptor", 
        status: sculptorResp.status,
        details: errText,
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { innovations } = await sculptorResp.json();

    if (!innovations || !Array.isArray(innovations)) {
      return new Response(JSON.stringify({ synced: 0, message: "No innovations returned" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert innovations into local synced_innovations table
    let syncedCount = 0;
    for (const inn of innovations) {
      const record = {
        external_id: inn.id,
        workspace_id,
        title: inn.title,
        description: inn.description || null,
        hypothesis: inn.hypothesis || null,
        expected_outcome: inn.expected_outcome || null,
        value_proposition: inn.value_proposition || null,
        effort_estimate: inn.effort_estimate || null,
        learnings: inn.learnings || null,
        responsible: inn.responsible || null,
        stage: inn.stage || "ideation",
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

      const { error } = await serviceSupabase
        .from("synced_innovations")
        .upsert(record, { onConflict: "external_id,source_app" });

      if (!error) syncedCount++;
      else console.error(`Failed to upsert innovation ${inn.id}:`, error.message);
    }

    return new Response(JSON.stringify({ synced: syncedCount, total: innovations.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("fetch-innovations error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
