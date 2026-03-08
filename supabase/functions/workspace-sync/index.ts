import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const syncSecret = Deno.env.get("CROSS_PROJECT_SYNC_SECRET");
    if (!syncSecret) throw new Error("CROSS_PROJECT_SYNC_SECRET not configured");

    const body = await req.json();
    const { action, sync_secret, workspace, members, initiatives } = body;

    // Validate shared secret
    if (sync_secret !== syncSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin client for service-level operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "create_workspace") {
      // Check if workspace already linked
      const { data: existing } = await supabaseAdmin
        .from("workspaces")
        .select("id")
        .eq("external_workspace_id", workspace.id)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({ success: true, workspace_id: existing.id, status: "already_linked" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create workspace
      const { data: newWs, error: wsError } = await supabaseAdmin
        .from("workspaces")
        .insert({
          name: workspace.name,
          description: workspace.description || null,
          external_workspace_id: workspace.id,
          external_source: "strategy_sculptor",
          created_by: "00000000-0000-0000-0000-000000000000", // system
        })
        .select()
        .single();

      if (wsError) throw wsError;

      // Sync members by email
      if (members && members.length > 0) {
        for (const member of members) {
          // Find user by email in profiles
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("user_id")
            .eq("email", member.email)
            .maybeSingle();

          if (profile) {
            // Add as workspace member
            await supabaseAdmin
              .from("workspace_members")
              .upsert(
                {
                  workspace_id: newWs.id,
                  user_id: profile.user_id,
                  role: member.role === "master_admin" ? "owner" : "member",
                },
                { onConflict: "workspace_id,user_id" }
              );
          }
          // If user doesn't exist yet, they'll be added when they sign up with same email
        }
      }

      return new Response(
        JSON.stringify({ success: true, workspace_id: newWs.id, status: "created" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "sync_members") {
      const { data: ws } = await supabaseAdmin
        .from("workspaces")
        .select("id")
        .eq("external_workspace_id", workspace.id)
        .maybeSingle();

      if (!ws) {
        return new Response(
          JSON.stringify({ error: "Workspace not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let synced = 0;
      for (const member of members) {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("user_id")
          .eq("email", member.email)
          .maybeSingle();

        if (profile) {
          await supabaseAdmin
            .from("workspace_members")
            .upsert(
              {
                workspace_id: ws.id,
                user_id: profile.user_id,
                role: member.role === "master_admin" ? "owner" : "member",
              },
              { onConflict: "workspace_id,user_id" }
            );
          synced++;
        }
      }

      return new Response(
        JSON.stringify({ success: true, synced_count: synced }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "sync_initiatives") {
      // Receive initiatives from Sculptor and create as intakes
      const { data: ws } = await supabaseAdmin
        .from("workspaces")
        .select("id")
        .eq("external_workspace_id", workspace.id)
        .maybeSingle();

      if (!ws) {
        return new Response(
          JSON.stringify({ error: "Workspace not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const results = [];
      for (const initiative of initiatives) {
        // Check if already linked via initiative_intake_links
        const { data: existingLink } = await supabaseAdmin
          .from("initiative_intake_links")
          .select("id, intake_id")
          .eq("initiative_id", initiative.id)
          .eq("tenant_id", workspace.id)
          .maybeSingle();

        if (existingLink) {
          results.push({ initiative_id: initiative.id, status: "already_linked", intake_id: existingLink.intake_id });
          continue;
        }

        // Create intake from initiative
        const { data: intake, error: intakeError } = await supabaseAdmin
          .from("intakes")
          .insert({
            title: initiative.title,
            requester_id: "00000000-0000-0000-0000-000000000000", // system - will be assigned
            workspace_id: ws.id,
            status: "draft",
            category: initiative.planning_category || null,
          })
          .select()
          .single();

        if (intakeError) {
          results.push({ initiative_id: initiative.id, status: "error", error: intakeError.message });
          continue;
        }

        // Create initiative link
        await supabaseAdmin
          .from("initiative_intake_links")
          .insert({
            initiative_id: initiative.id,
            initiative_title: initiative.title,
            intake_id: intake.id,
            tenant_id: workspace.id,
            source_app: "strategy_sculptor",
            sync_status: "linked",
            initiative_data: initiative,
          });

        results.push({ initiative_id: initiative.id, status: "created", intake_id: intake.id });
      }

      return new Response(
        JSON.stringify({ success: true, results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Workspace sync error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
