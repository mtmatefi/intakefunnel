import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { intake_id } = body;

    if (!intake_id) {
      return new Response(
        JSON.stringify({ error: "Missing intake_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to gather all enrichment data
    const db = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all data in parallel
    const [
      { data: links },
      { data: intake },
      { data: approval },
      { data: impactScore },
      { data: routingScores },
      { data: specs },
      { data: jiraExports },
    ] = await Promise.all([
      db.from("initiative_intake_links").select("*").eq("intake_id", intake_id),
      db.from("intakes").select("*").eq("id", intake_id).single(),
      db.from("approvals").select("*").eq("intake_id", intake_id).order("decided_at", { ascending: false }).limit(1).maybeSingle(),
      db.from("impact_scores").select("*").eq("intake_id", intake_id).maybeSingle(),
      db.from("routing_scores").select("*").eq("intake_id", intake_id),
      db.from("spec_documents").select("*").eq("intake_id", intake_id).order("version", { ascending: false }).limit(1).maybeSingle(),
      db.from("jira_exports").select("*").eq("intake_id", intake_id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    if (!links || links.length === 0) {
      return new Response(
        JSON.stringify({ error: "No initiative links found for this intake", intake_id }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get architect profile if approval exists
    let architectName = null;
    if (approval) {
      const { data: profile } = await db
        .from("profiles")
        .select("display_name")
        .eq("user_id", approval.architect_id)
        .maybeSingle();
      architectName = profile?.display_name || "Unknown";
    }

    // Build enrichment payload
    const enrichment: Record<string, any> = {
      status: intake?.status || "unknown",
    };

    // Delivery path from routing scores
    if (routingScores && routingScores.length > 0) {
      const sorted = [...routingScores].sort((a, b) => b.score - a.score);
      enrichment.delivery_path = {
        recommended: sorted[0].path,
        score: sorted[0].score,
        alternatives: sorted.slice(1).map((r) => ({ path: r.path, score: r.score })),
      };
    }

    // Impact / WSJF scores
    if (impactScore) {
      enrichment.impact_scores = {
        business_value: impactScore.business_value,
        time_criticality: impactScore.time_criticality,
        risk_reduction: impactScore.risk_reduction,
        strategic_fit: impactScore.strategic_fit,
        effort_estimate: impactScore.effort_estimate,
        wsjf_score: impactScore.wsjf_score,
      };
    }

    // Spec summary
    if (specs) {
      const structured = specs.structured_json as Record<string, any> || {};
      enrichment.spec_summary = {
        version: specs.version,
        functional_requirements: structured.functional_requirements || [],
        non_functional_requirements: structured.non_functional_requirements || [],
        data_classification: structured.data_classification || null,
        integration_points: structured.integration_points || [],
        estimated_complexity: structured.complexity || null,
      };
    }

    // Architect decision + guardrails
    if (approval) {
      enrichment.architect_decision = {
        decision: approval.decision,
        architect: architectName,
        guardrails: approval.guardrails_json || {},
        conditions: approval.comments || null,
        decided_at: approval.decided_at,
      };
    }

    // Jira artifacts
    if (jiraExports) {
      enrichment.jira_artifacts = {
        epic_key: jiraExports.epic_key,
        jpd_issue_key: jiraExports.jpd_issue_key,
        jsm_request_key: jiraExports.jsm_request_key,
      };
    }

    // Send to each linked callback URL
    const results: Array<{ tenant_id: string; initiative_id: string; status: string; error?: string }> = [];

    for (const link of links) {
      if (!link.callback_url) {
        results.push({
          tenant_id: link.tenant_id,
          initiative_id: link.initiative_id,
          status: "skipped",
          error: "No callback_url configured",
        });
        continue;
      }

      const payload = {
        event: "intake_enriched",
        tenant_id: link.tenant_id,
        initiative_id: link.initiative_id,
        intake_id,
        timestamp: new Date().toISOString(),
        enrichment,
      };

      try {
        const resp = await fetch(link.callback_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (resp.ok) {
          // Mark enrichment as sent
          await db
            .from("initiative_intake_links")
            .update({
              sync_status: "enrichment_sent",
              enrichment_sent_at: new Date().toISOString(),
              last_synced_at: new Date().toISOString(),
            })
            .eq("id", link.id);

          results.push({
            tenant_id: link.tenant_id,
            initiative_id: link.initiative_id,
            status: "sent",
          });
        } else {
          const errText = await resp.text();
          results.push({
            tenant_id: link.tenant_id,
            initiative_id: link.initiative_id,
            status: "failed",
            error: `HTTP ${resp.status}: ${errText.substring(0, 200)}`,
          });
        }
      } catch (fetchErr) {
        results.push({
          tenant_id: link.tenant_id,
          initiative_id: link.initiative_id,
          status: "failed",
          error: fetchErr instanceof Error ? fetchErr.message : "Fetch error",
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Notify sculptor error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
