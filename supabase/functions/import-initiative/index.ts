import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-tenant-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth: validate shared secret ──
    const tenantApiKey = req.headers.get("x-tenant-api-key");
    const expectedSecret = Deno.env.get("CROSS_PROJECT_SYNC_SECRET");

    if (!tenantApiKey || !expectedSecret || tenantApiKey !== expectedSecret) {
      return new Response(
        JSON.stringify({ error: "Unauthorized – invalid or missing x-tenant-api-key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const {
      tenant_id,
      initiative_id,
      initiative_title,
      initiative_data,
      create_intake,
      intake_defaults,
      callback_url,
    } = body;

    if (!tenant_id || !initiative_id || !initiative_title) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: tenant_id, initiative_id, initiative_title" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── 1. Upsert initiative link ──
    const { data: link, error: linkError } = await supabase
      .from("initiative_intake_links")
      .upsert(
        {
          tenant_id,
          initiative_id,
          initiative_title,
          initiative_data: initiative_data || {},
          source_app: "strategy_sculptor",
          sync_status: "linked",
          last_synced_at: new Date().toISOString(),
          callback_url: callback_url || null,
        },
        { onConflict: "tenant_id,initiative_id" }
      )
      .select()
      .single();

    if (linkError) {
      console.error("Link upsert error:", linkError);
      return new Response(
        JSON.stringify({ error: "Failed to upsert initiative link", details: linkError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 2. Also upsert into synced_innovations so Pipeline UI shows it ──
    if (initiative_data) {
      await supabase.from("synced_innovations").upsert(
        {
          external_id: initiative_id,
          title: initiative_title,
          description: initiative_data.description || initiative_data.value_proposition || null,
          hypothesis: initiative_data.hypothesis || null,
          expected_outcome: initiative_data.expected_outcome || null,
          value_proposition: initiative_data.value_proposition || null,
          effort_estimate: initiative_data.effort_estimate || null,
          learnings: initiative_data.learnings || null,
          responsible: initiative_data.responsible || null,
          stage: initiative_data.stage || "implement",
          status: initiative_data.status || "green",
          target_date: initiative_data.target_date || null,
          product_name: initiative_data.product_name || null,
          impact_data: initiative_data.impact_links || initiative_data.impact_data || [],
          trend_data: initiative_data.trend_links || initiative_data.trend_data || [],
          risk_data: initiative_data.risk_links || initiative_data.risk_data || [],
          source_app: "strategy_sculptor",
          synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "external_id,source_app" }
      );
    }

    let intake = null;

    // ── 3. Auto-create intake if requested ──
    if (create_intake && !link.intake_id) {
      const requesterId = intake_defaults?.requester_id;
      if (!requesterId) {
        return new Response(
          JSON.stringify({ error: "create_intake requires intake_defaults.requester_id", link }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: newIntake, error: intakeError } = await supabase
        .from("intakes")
        .insert({
          title: initiative_title,
          requester_id: requesterId,
          status: "draft",
          category: intake_defaults?.category || "Innovation Implementation",
          value_stream: intake_defaults?.value_stream || initiative_data?.value_stream || null,
          priority: intake_defaults?.priority || "medium",
        })
        .select()
        .single();

      if (intakeError) {
        console.error("Intake creation error:", intakeError);
        return new Response(
          JSON.stringify({ error: "Initiative linked but intake creation failed", details: intakeError.message, link }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      intake = newIntake;

      // Update link with intake_id
      await supabase
        .from("initiative_intake_links")
        .update({ intake_id: newIntake.id, sync_status: "intake_created" })
        .eq("id", link.id);

      // Create system transcript with all imported context
      const contextParts: string[] = [
        `[Importiert aus Strategy Sculptor]`,
        `**Initiative:** ${initiative_title}`,
      ];
      if (initiative_data?.description) contextParts.push(`**Beschreibung:** ${initiative_data.description}`);
      if (initiative_data?.value_proposition) contextParts.push(`**Value Proposition:** ${initiative_data.value_proposition}`);
      if (initiative_data?.hypothesis) contextParts.push(`**Hypothese:** ${initiative_data.hypothesis}`);
      if (initiative_data?.expected_outcome) contextParts.push(`**Erwartetes Ergebnis:** ${initiative_data.expected_outcome}`);
      if (initiative_data?.effort_estimate) contextParts.push(`**Aufwand:** ${initiative_data.effort_estimate}`);

      await supabase.from("transcripts").insert({
        intake_id: newIntake.id,
        speaker: "system",
        message: contextParts.join("\n\n"),
        question_key: "imported_context",
      });
    }

    // ── 4. Enrichment callback ──
    let callbackResult = null;
    if (callback_url && (intake || link.intake_id)) {
      const intakeId = intake?.id || link.intake_id;
      const enrichmentPayload = {
        initiative_id,
        tenant_id,
        intake_id: intakeId,
        intake_status: intake ? "draft" : "linked",
        intake_title: intake?.title || initiative_title,
        intake_url: `${Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovable.app")}/intake/${intakeId}`,
        enrichment: {
          received_at: new Date().toISOString(),
          fields_captured: Object.keys(initiative_data || {}),
          intake_created: !!intake,
        },
      };

      try {
        const cbResp = await fetch(callback_url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-tenant-api-key": expectedSecret,
          },
          body: JSON.stringify(enrichmentPayload),
        });
        callbackResult = { status: cbResp.status, ok: cbResp.ok };

        // Mark enrichment sent
        await supabase
          .from("initiative_intake_links")
          .update({ enrichment_sent_at: new Date().toISOString() })
          .eq("id", link.id);
      } catch (cbErr) {
        console.error("Callback error:", cbErr);
        callbackResult = { status: 0, ok: false, error: cbErr instanceof Error ? cbErr.message : "unknown" };
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        link,
        intake,
        callback: callbackResult,
        message: intake
          ? `Initiative linked and intake created: ${intake.id}`
          : `Initiative linked successfully`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Import initiative error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
