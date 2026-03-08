import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * After spec generation, this function uses AI to break down
 * the spec into Epics → Features → Stories and stores them
 * as draft work items linked to the innovation (if applicable).
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { intakeId } = await req.json();
    if (!intakeId) {
      return new Response(JSON.stringify({ error: "intakeId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch spec
    const { data: spec, error: specErr } = await db
      .from("spec_documents")
      .select("structured_json, intake_id")
      .eq("intake_id", intakeId)
      .order("version", { ascending: false })
      .limit(1)
      .single();

    if (specErr || !spec) {
      return new Response(JSON.stringify({ error: "Spec not found for this intake" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find linked innovation (if intake came from an innovation)
    const { data: link } = await db
      .from("initiative_intake_links")
      .select("initiative_id, source_app")
      .eq("intake_id", intakeId)
      .maybeSingle();

    let innovationId: string | null = null;
    if (link?.initiative_id) {
      // Find local synced_innovations record by external_id
      const { data: inn } = await db
        .from("synced_innovations")
        .select("id")
        .eq("external_id", link.initiative_id)
        .maybeSingle();
      innovationId = inn?.id || null;
    }

    // If no innovation link, create a virtual one from the intake itself
    // (we still generate work items, they just won't be linked to a sculptor innovation)
    if (!innovationId) {
      // Check if there's already an innovation by intake title
      const { data: intake } = await db
        .from("intakes")
        .select("title, workspace_id")
        .eq("id", intakeId)
        .single();

      if (intake) {
        // Create a local-only innovation record
        const { data: newInn } = await db
          .from("synced_innovations")
          .insert({
            external_id: `intake-${intakeId}`,
            title: intake.title,
            workspace_id: intake.workspace_id,
            stage: "implement",
            source_app: "intake_funnel",
            description: `Auto-generiert aus Intake: ${intake.title}`,
          })
          .select("id")
          .single();
        innovationId = newInn?.id || null;
      }
    }

    if (!innovationId) {
      return new Response(JSON.stringify({ error: "Could not resolve innovation for work items" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if work items already exist for this innovation
    const { data: existing } = await db
      .from("innovation_work_items")
      .select("id")
      .eq("innovation_id", innovationId)
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({
        success: true,
        skipped: true,
        message: "Work items already exist for this innovation",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const structuredSpec = spec.structured_json as any;

    // Call AI to generate work item breakdown
    const systemPrompt = `Du bist ein erfahrener Product Owner und technischer Architekt. 
Deine Aufgabe: Aus einer Software-Spezifikation eine hierarchische Aufgliederung in Epics, Features und Stories erstellen.

Regeln:
- Jedes Epic ist ein großes Arbeitspaket (1-4 Epics) mit Beschreibung
- Jedes Feature ist ein fachliches Feature innerhalb eines Epics (1-5 Features pro Epic) mit funktionalen und nicht-funktionalen Anforderungen
- Jede Story ist eine einzelne umsetzbare User Story (1-5 Stories pro Feature) mit:
  - Titel im Format "Als [Rolle] möchte ich [Aktion], damit [Nutzen]"
  - Beschreibung
  - Acceptance Criteria (testbare Kriterien)
  - Funktionale Anforderungen
  - Nicht-funktionale Anforderungen (Performance, Sicherheit, etc.)
  - Story Points (Fibonacci: 1,2,3,5,8,13)
  - Priorität (high/medium/low)
  - Definition of Done
- Alle Texte auf DEUTSCH
- Realistische, umsetzbare Aufteilung
- Berücksichtige die Acceptance Criteria und Risiken aus der Spec`;

    const specSummary = `
Problemstellung: ${structuredSpec.problemStatement || "N/A"}
Ziele: ${(structuredSpec.goals || []).join(", ")}
Benutzer: ${(structuredSpec.users || []).map((u: any) => \`\${u.persona} (\${u.count})\`).join(", ")}
Integrationen: ${(structuredSpec.integrations || []).map((i: any) => i.system).join(", ")}
Datenklassifizierung: ${structuredSpec.dataClassification || "N/A"}
Acceptance Criteria: ${(structuredSpec.acceptanceCriteria || []).map((ac: any) => ac.storyRef + ": " + ac.when).join("; ")}
Risiken: ${(structuredSpec.risks || []).map((r: any) => r.description).join("; ")}
NFRs: Verfügbarkeit: ${structuredSpec.nfrs?.availability || "N/A"}, Antwortzeit: ${structuredSpec.nfrs?.responseTime || "N/A"}
`;

    console.log("Generating work items for innovation:", innovationId);

    const storySchema = {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        acceptance_criteria: { type: "array", items: { type: "string" } },
        functional_requirements: { type: "array", items: { type: "string" } },
        non_functional_requirements: { type: "array", items: { type: "string" } },
        story_points: { type: "integer", enum: [1, 2, 3, 5, 8, 13] },
        priority: { type: "string", enum: ["high", "medium", "low"] },
        definition_of_done: { type: "string" },
      },
      required: ["title", "acceptance_criteria"],
    };

    const featureSchema = {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        functional_requirements: { type: "array", items: { type: "string" } },
        non_functional_requirements: { type: "array", items: { type: "string" } },
        priority: { type: "string", enum: ["high", "medium", "low"] },
        definition_of_done: { type: "string" },
        stories: { type: "array", items: storySchema },
      },
      required: ["title"],
    };

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: \`Bearer \${LOVABLE_API_KEY}\`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: \`Erstelle eine hierarchische Aufgliederung für folgende Spezifikation:\n\n\${specSummary}\` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_work_items",
              description: "Create hierarchical work item breakdown (Epics → Features → Stories) with full details",
              parameters: {
                type: "object",
                properties: {
                  epics: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        priority: { type: "string", enum: ["high", "medium", "low"] },
                        features: { type: "array", items: featureSchema },
                      },
                      required: ["title"],
                    },
                  },
                },
                required: ["epics"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_work_items" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
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
    if (!toolCall || toolCall.function.name !== "create_work_items") {
      throw new Error("AI did not return work items");
    }

    const { epics } = JSON.parse(toolCall.function.arguments);
    console.log(`AI generated ${epics.length} epics`);

    // Insert work items into DB with hierarchy
    const createdItems: Array<{ id: string; type: string; title: string }> = [];
    let itemIndex = 0;

    for (const epic of epics) {
      itemIndex++;
      const epicExternalId = `auto-${intakeId}-epic-${itemIndex}`;

      const { data: epicRow, error: epicErr } = await db
        .from("innovation_work_items")
        .insert({
          innovation_id: innovationId,
          external_id: epicExternalId,
          item_type: "epic",
          title: epic.title,
          description: epic.description || null,
          priority: epic.priority || "high",
          status: "draft",
          source_app: "intake_funnel",
        })
        .select("id")
        .single();

      if (epicErr) {
        console.error("Failed to insert epic:", epicErr);
        continue;
      }
      createdItems.push({ id: epicRow.id, type: "epic", title: epic.title });

      // Features
      let featureIdx = 0;
      for (const feature of epic.features || []) {
        featureIdx++;
        const featureExternalId = `auto-${intakeId}-feature-${itemIndex}-${featureIdx}`;

        const { data: featureRow, error: featureErr } = await db
          .from("innovation_work_items")
          .insert({
            innovation_id: innovationId,
            external_id: featureExternalId,
            parent_id: epicRow.id,
            item_type: "feature",
            title: feature.title,
            description: feature.description || null,
            functional_requirements: feature.functional_requirements || [],
            non_functional_requirements: feature.non_functional_requirements || [],
            priority: feature.priority || "medium",
            definition_of_done: feature.definition_of_done || null,
            status: "draft",
            source_app: "intake_funnel",
          })
          .select("id")
          .single();

        if (featureErr) {
          console.error("Failed to insert feature:", featureErr);
          continue;
        }
        createdItems.push({ id: featureRow.id, type: "feature", title: feature.title });

        // Stories
        let storyIdx = 0;
        for (const story of feature.stories || []) {
          storyIdx++;
          const storyExternalId = `auto-${intakeId}-story-${itemIndex}-${featureIdx}-${storyIdx}`;

          const { data: storyRow, error: storyErr } = await db
            .from("innovation_work_items")
            .insert({
              innovation_id: innovationId,
              external_id: storyExternalId,
              parent_id: featureRow.id,
              item_type: "story",
              title: story.title,
              description: story.description || null,
              status: "draft",
              source_app: "intake_funnel",
            })
            .select("id")
            .single();

          if (!storyErr && storyRow) {
            createdItems.push({ id: storyRow.id, type: "story", title: story.title });
          }
        }
      }
    }

    console.log(`Created ${createdItems.length} work items total`);

    // Sync generated items to Sculptor if applicable
    const sculptorUrl = Deno.env.get("SCULPTOR_SUPABASE_URL");
    const syncSecret = Deno.env.get("CROSS_PROJECT_SYNC_SECRET");
    let sculptorSynced = false;

    if (sculptorUrl && syncSecret && link?.initiative_id) {
      try {
        // Fetch all created work items with hierarchy info
        const { data: allItems } = await db
          .from("innovation_work_items")
          .select("*")
          .eq("innovation_id", innovationId);

        const payload = {
          event: "work_items_generated",
          innovation_external_id: link.initiative_id,
          source: "intake_funnel",
          work_items: (allItems || []).map((wi: any) => ({
            external_id: wi.external_id,
            type: wi.item_type,
            title: wi.title,
            description: wi.description,
            status: wi.status,
            parent_external_id: allItems?.find((p: any) => p.id === wi.parent_id)?.external_id || null,
          })),
        };

        const resp = await fetch(`${sculptorUrl}/functions/v1/receive-feedback`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-sync-secret": syncSecret,
          },
          body: JSON.stringify(payload),
        });

        sculptorSynced = resp.ok;
        console.log(`Sculptor sync: ${resp.status}`);
      } catch (err) {
        console.warn("Sculptor sync failed:", err);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      innovation_id: innovationId,
      created_count: createdItems.length,
      items: createdItems,
      sculptor_synced: sculptorSynced,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("generate-work-items error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
