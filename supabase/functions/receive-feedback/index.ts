import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-sync-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Authenticate via x-sync-secret
    const syncSecret = req.headers.get("x-sync-secret");
    const expectedSecret = Deno.env.get("CROSS_PROJECT_SYNC_SECRET");

    if (!syncSecret || !expectedSecret || syncSecret !== expectedSecret) {
      return new Response(
        JSON.stringify({ error: "Unauthorized – invalid x-sync-secret" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const {
      event,
      innovation_external_id,
      feedback,
    } = body;

    if (event !== "innovation_feedback" || !innovation_external_id || !feedback?.comment) {
      return new Response(
        JSON.stringify({ error: "Invalid payload – need event='innovation_feedback', innovation_external_id, feedback.comment" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, supabaseServiceKey);

    // Look up innovation by external_id
    const { data: innovation, error: lookupErr } = await db
      .from("synced_innovations")
      .select("id")
      .eq("external_id", innovation_external_id)
      .maybeSingle();

    if (lookupErr || !innovation) {
      return new Response(
        JSON.stringify({ error: "Innovation not found for external_id", innovation_external_id }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use a system service user for external feedback
    const serviceUserId = "00000000-0000-0000-0000-000000000000";

    // Insert feedback
    const { data: inserted, error: insertErr } = await db
      .from("innovation_feedback")
      .insert({
        innovation_id: innovation.id,
        user_id: serviceUserId,
        comment: feedback.comment,
        feedback_type: feedback.feedback_type || "comment",
        author_name: feedback.author || "Strategy Sculptor",
        source_app: feedback.source_app || "strategy_sculptor",
      })
      .select()
      .single();

    if (insertErr) {
      console.error("Insert error:", insertErr);
      return new Response(
        JSON.stringify({ error: "Failed to insert feedback", details: insertErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, feedback_id: inserted.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("receive-feedback error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
