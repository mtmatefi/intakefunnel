import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Sends sync events to the Strategy Sculptor project.
 * Called after workspace creation/member changes in Intake Router.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const syncSecret = Deno.env.get("CROSS_PROJECT_SYNC_SECRET");
    const sculptorUrl = Deno.env.get("SCULPTOR_SUPABASE_URL");
    if (!syncSecret) throw new Error("CROSS_PROJECT_SYNC_SECRET not configured");
    if (!sculptorUrl) throw new Error("SCULPTOR_SUPABASE_URL not configured");

    // Validate JWT
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

    const userId = claimsData.claims.sub;
    const body = await req.json();
    const { action, workspace_id } = body;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "sync_workspace_to_sculptor") {
      // Fetch workspace details
      const { data: ws, error: wsError } = await supabaseAdmin
        .from("workspaces")
        .select("*")
        .eq("id", workspace_id)
        .single();

      if (wsError || !ws) throw new Error("Workspace not found");

      // Fetch members with emails
      const { data: members } = await supabaseAdmin
        .from("workspace_members")
        .select("user_id, role")
        .eq("workspace_id", workspace_id);

      const memberEmails = [];
      for (const m of members || []) {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("email")
          .eq("user_id", m.user_id)
          .maybeSingle();
        if (profile?.email) {
          memberEmails.push({ email: profile.email, role: m.role });
        }
      }

      // Call Sculptor's workspace-sync endpoint
      const syncUrl = `${sculptorUrl}/functions/v1/workspace-sync`;
      console.log("Calling Sculptor sync:", syncUrl, "for workspace:", ws.name);
      const resp = await fetch(syncUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-sync-secret": syncSecret,
        },
        body: JSON.stringify({
          action: "create_workspace",
          workspace_name: ws.name,
          workspace_description: ws.description,
          external_workspace_id: ws.id,
          member_emails: memberEmails.map((m) => m.email),
        }),
      });
      console.log("Sculptor response status:", resp.status);

      const result = await resp.json();

      if (result.workspace_id && !ws.external_workspace_id) {
        // Store the Sculptor workspace ID back
        await supabaseAdmin
          .from("workspaces")
          .update({
            external_workspace_id: result.workspace_id,
            external_source: "strategy_sculptor",
          })
          .eq("id", workspace_id);
      }

      return new Response(JSON.stringify({ success: true, sculptor_result: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Sync to sculptor error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
