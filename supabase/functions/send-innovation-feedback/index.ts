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
    const sculptorUrl = Deno.env.get("SCULPTOR_SUPABASE_URL");

    // Verify user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { innovation_id, comment, feedback_type = "comment" } = body;

    if (!innovation_id || !comment) {
      return new Response(
        JSON.stringify({ error: "Missing innovation_id or comment" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const db = createClient(supabaseUrl, supabaseServiceKey);

    // Get the innovation to find external_id
    const { data: innovation } = await db
      .from("synced_innovations")
      .select("external_id, title, workspace_id")
      .eq("id", innovation_id)
      .single();

    if (!innovation) {
      return new Response(
        JSON.stringify({ error: "Innovation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user profile for display name
    const { data: profile } = await db
      .from("profiles")
      .select("display_name, email")
      .eq("user_id", user.id)
      .maybeSingle();

    // Build payload for Sculptor
    const payload = {
      event: "innovation_feedback",
      innovation_external_id: innovation.external_id,
      innovation_title: innovation.title,
      feedback: {
        comment,
        feedback_type,
        author: profile?.display_name || profile?.email || user.id,
        source_app: "intake_funnel",
        created_at: new Date().toISOString(),
      },
    };

    // Try to send to Sculptor's workspace-event endpoint
    if (sculptorUrl) {
      try {
        const sculptorEndpoint = `${sculptorUrl}/functions/v1/receive-feedback`;
        const syncSecret = Deno.env.get("CROSS_PROJECT_SYNC_SECRET") || "";

        const resp = await fetch(sculptorEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-sync-secret": syncSecret,
          },
          body: JSON.stringify(payload),
        });

        const resultText = await resp.text();
        console.log(`Sculptor feedback sync: ${resp.status}`, resultText.substring(0, 200));

        return new Response(
          JSON.stringify({
            success: true,
            synced_to_sculptor: resp.ok,
            sculptor_status: resp.status,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (fetchErr) {
        console.warn("Failed to sync feedback to Sculptor:", fetchErr);
        return new Response(
          JSON.stringify({
            success: true,
            synced_to_sculptor: false,
            error: "Sculptor endpoint not reachable",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        synced_to_sculptor: false,
        reason: "No SCULPTOR_SUPABASE_URL configured",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-innovation-feedback error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
