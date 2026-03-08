import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cross-project-secret",
};

/**
 * Read-only endpoint for Strategy Sculptor to fetch work items for an innovation.
 * Auth: x-cross-project-secret header.
 * Usage: GET /get-work-items?innovation_id=<uuid>
 *    or: GET /get-work-items?external_id=<external_id>
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const secret = req.headers.get("x-cross-project-secret");
    const expectedSecret = Deno.env.get("CROSS_PROJECT_SYNC_SECRET");
    if (!secret || secret !== expectedSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    let innovationId = url.searchParams.get("innovation_id");
    const externalId = url.searchParams.get("external_id");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Resolve external_id → innovation_id if needed
    if (!innovationId && externalId) {
      const { data: inn } = await supabase
        .from("synced_innovations")
        .select("id")
        .eq("external_id", externalId)
        .single();
      if (inn) innovationId = inn.id;
    }

    if (!innovationId) {
      return new Response(
        JSON.stringify({ error: "innovation_id or external_id query parameter required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all work items
    const { data: items, error } = await supabase
      .from("innovation_work_items")
      .select("*")
      .eq("innovation_id", innovationId)
      .order("item_type", { ascending: true });

    if (error) throw error;

    // Build tree
    const map: Record<string, any> = {};
    const roots: any[] = [];
    for (const item of items || []) {
      map[item.id] = { ...item, children: [] };
    }
    for (const item of items || []) {
      const node = map[item.id];
      if (item.parent_id && map[item.parent_id]) {
        map[item.parent_id].children.push(node);
      } else {
        roots.push(node);
      }
    }

    const totalStoryPoints = (items || []).reduce(
      (sum: number, i: any) => sum + (i.story_points || 0), 0
    );

    return new Response(
      JSON.stringify({
        innovation_id: innovationId,
        total_items: (items || []).length,
        total_story_points: totalStoryPoints,
        counts: {
          epics: (items || []).filter((i: any) => i.item_type === "epic").length,
          features: (items || []).filter((i: any) => i.item_type === "feature").length,
          stories: (items || []).filter((i: any) => i.item_type === "story").length,
        },
        tree: roots,
        flat: items || [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("get-work-items error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
