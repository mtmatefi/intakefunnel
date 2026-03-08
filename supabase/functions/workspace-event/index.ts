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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sculptorUrl = Deno.env.get("SCULPTOR_SUPABASE_URL");
    const syncSecret = Deno.env.get("CROSS_PROJECT_SYNC_SECRET");

    // Verify user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { workspace_id, action } = body; // action: "trashed" | "deleted" | "restored"

    if (!workspace_id || !action) {
      return new Response(JSON.stringify({ error: "Missing workspace_id or action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const db = createClient(supabaseUrl, supabaseServiceKey);

    // Get workspace to check if it's linked to Sculptor
    const { data: workspace } = await db
      .from("workspaces")
      .select("*")
      .eq("id", workspace_id)
      .maybeSingle();

    if (!workspace) {
      return new Response(JSON.stringify({ error: "Workspace not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only notify if workspace is linked to Sculptor
    if (!workspace.external_workspace_id || !sculptorUrl || !syncSecret) {
      return new Response(JSON.stringify({
        success: true,
        notified: false,
        reason: "Workspace not linked to Strategy Sculptor or missing config",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send notification to Sculptor's workspace-sync endpoint
    const payload = {
      event: "workspace_status_changed",
      source: "intake_router",
      workspace_id: workspace.external_workspace_id,
      intake_router_workspace_id: workspace_id,
      action, // "trashed" | "deleted" | "restored"
      workspace_name: workspace.name,
      timestamp: new Date().toISOString(),
      changed_by: user.email,
    };

    const sculptorEndpoint = `${sculptorUrl}/functions/v1/workspace-sync`;

    const resp = await fetch(sculptorEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-sync-secret": syncSecret,
      },
      body: JSON.stringify(payload),
    });

    const notified = resp.ok;
    let sculptorResponse = null;
    try {
      sculptorResponse = await resp.json();
    } catch {
      // ignore parse errors
    }

    return new Response(JSON.stringify({
      success: true,
      notified,
      sculptor_status: resp.status,
      sculptor_response: sculptorResponse,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Workspace event notify error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
