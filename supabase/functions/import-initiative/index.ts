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
    // Validate tenant API key from header
    const tenantApiKey = req.headers.get("x-tenant-api-key");
    if (!tenantApiKey || tenantApiKey.length < 16) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid x-tenant-api-key header" }),
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
    } = body;

    // Validate required fields
    if (!tenant_id || !initiative_id || !initiative_title) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: tenant_id, initiative_id, initiative_title",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate tenant_api_key matches tenant_id pattern (simple hash check)
    // In production, store tenant keys in a tenants table and validate against it
    const expectedKeyPrefix = `tk_${tenant_id.substring(0, 8)}`;
    if (!tenantApiKey.startsWith(expectedKeyPrefix)) {
      return new Response(
        JSON.stringify({ error: "Tenant API key does not match tenant_id" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Upsert the initiative link
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

    let intake = null;

    // Optionally auto-create an intake from the initiative
    if (create_intake && !link.intake_id) {
      // We need a requester_id – use a system/service account or the first admin
      const requesterId = intake_defaults?.requester_id;
      if (!requesterId) {
        return new Response(
          JSON.stringify({
            error: "create_intake requires intake_defaults.requester_id",
            link,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: newIntake, error: intakeError } = await supabase
        .from("intakes")
        .insert({
          title: initiative_title,
          requester_id: requesterId,
          status: "draft",
          category: intake_defaults?.category || "Strategy Initiative",
          value_stream: intake_defaults?.value_stream || initiative_data?.value_stream || null,
          priority: intake_defaults?.priority || "medium",
        })
        .select()
        .single();

      if (intakeError) {
        console.error("Intake creation error:", intakeError);
        return new Response(
          JSON.stringify({
            error: "Initiative linked but intake creation failed",
            details: intakeError.message,
            link,
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      intake = newIntake;

      // Link the new intake
      await supabase
        .from("initiative_intake_links")
        .update({ intake_id: newIntake.id, sync_status: "intake_created" })
        .eq("id", link.id);

      // Create initial transcript from initiative data
      if (initiative_data?.description) {
        await supabase.from("transcripts").insert({
          intake_id: newIntake.id,
          speaker: "system",
          message: `[Importiert aus Strategy Sculptor]\n\n**Initiative:** ${initiative_title}\n\n${initiative_data.description}`,
          question_key: "imported_context",
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        link,
        intake,
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
