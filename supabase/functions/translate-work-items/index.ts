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
    const { workItemIds, targetLanguage = "en" } = await req.json();
    if (!workItemIds || !Array.isArray(workItemIds) || workItemIds.length === 0) {
      return new Response(JSON.stringify({ error: "workItemIds required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch items
    const { data: items, error } = await db
      .from("innovation_work_items")
      .select("id, title, description, acceptance_criteria, functional_requirements, non_functional_requirements, definition_of_done")
      .in("id", workItemIds);

    if (error) throw error;
    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ error: "No items found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const langLabel = targetLanguage === "en" ? "English" : targetLanguage;

    // Build payload for AI
    const itemsPayload = items.map((it: any) => ({
      id: it.id,
      title: it.title,
      description: it.description,
      acceptance_criteria: it.acceptance_criteria,
      functional_requirements: it.functional_requirements,
      non_functional_requirements: it.non_functional_requirements,
      definition_of_done: it.definition_of_done,
    }));

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a professional translator for software development artifacts. Translate all text fields to ${langLabel}. Keep technical terms, abbreviations, and proper nouns unchanged. Maintain the exact same structure. User Stories should follow "As a [role] I want [action] so that [benefit]" format in the target language.`,
          },
          {
            role: "user",
            content: `Translate these work items to ${langLabel}:\n\n${JSON.stringify(itemsPayload, null, 2)}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "save_translations",
              description: `Save translated work items in ${langLabel}`,
              parameters: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        title: { type: "string" },
                        description: { type: "string" },
                        acceptance_criteria: { type: "array", items: { type: "string" } },
                        functional_requirements: { type: "array", items: { type: "string" } },
                        non_functional_requirements: { type: "array", items: { type: "string" } },
                        definition_of_done: { type: "string" },
                      },
                      required: ["id", "title"],
                    },
                  },
                },
                required: ["items"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "save_translations" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "save_translations") {
      throw new Error("AI did not return translations");
    }

    const { items: translated } = JSON.parse(toolCall.function.arguments);
    console.log(`Translated ${translated.length} items to ${langLabel}`);

    // Update each item in DB
    let updatedCount = 0;
    for (const t of translated) {
      const updatePayload: Record<string, any> = { title: t.title };
      if (t.description) updatePayload.description = t.description;
      if (t.acceptance_criteria) updatePayload.acceptance_criteria = t.acceptance_criteria;
      if (t.functional_requirements) updatePayload.functional_requirements = t.functional_requirements;
      if (t.non_functional_requirements) updatePayload.non_functional_requirements = t.non_functional_requirements;
      if (t.definition_of_done) updatePayload.definition_of_done = t.definition_of_done;

      const { error: upErr } = await db
        .from("innovation_work_items")
        .update(updatePayload)
        .eq("id", t.id);

      if (upErr) {
        console.error(`Failed to update ${t.id}:`, upErr);
      } else {
        updatedCount++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      translated_count: updatedCount,
      target_language: targetLanguage,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("translate-work-items error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
