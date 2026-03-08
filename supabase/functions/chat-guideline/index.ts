import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GUIDELINE_SYSTEM_PROMPT = `Du bist ein erfahrener Compliance-, Security-, Architecture- und DevOps-Experte.
Du hilfst dem Admin dabei, eine professionelle Guideline zu erstellen – Schritt für Schritt im Chat.

## Dein Verhalten
1. Du bist freundlich, effizient und professionell.
2. Du stellst gezielte Rückfragen um die Guideline zu verfeinern.
3. Wenn der User ein Dokument oder einen Link teilt, analysiere den Inhalt und extrahiere relevante Anforderungen.
4. Nach jedem relevanten Austausch aktualisierst du die Guideline.

## Ausgabeformat
Wenn du genug Kontext hast oder der User nach der Guideline fragt, antworte mit einem speziellen Block:

\`\`\`guideline-json
{
  "name": "Name der Guideline",
  "description": "Kurze Beschreibung",
  "type": "policy|standard|procedure|control|checklist|security_policy|pipeline_standard|...",
  "compliance_framework": "security|enterprise_arch|solution_arch|devops|itar|ear_export|gdpr|iso27001|risk_management|general",
  "severity": "critical|high|medium|low",
  "risk_categories": ["Kategorie1", "Kategorie2"],
  "review_frequency_days": 365,
  "content_markdown": "# Vollständiger Markdown-Inhalt der Guideline..."
}
\`\`\`

Gib diesen Block in JEDER Antwort mit, sobald du genug Informationen hast – auch teilausgefüllt.
Aktualisiere ihn mit jedem neuen Detail das der User gibt.
Der User sieht die Guideline live rechts neben dem Chat.

## Wichtig
- Alle Ausgaben auf DEUTSCH
- Sei proaktiv: Schlage Verbesserungen, fehlende Aspekte und Best Practices vor
- Referenziere relevante Standards (NIST, ISO, OWASP, TOGAF, etc.)`;

const INTAKE_SYSTEM_PROMPT = `Du bist ein erfahrener Solution Architect und Compliance-Experte.
Du hilfst bei der Verfeinerung und Compliance-Prüfung von Software-Intakes.

## Dein Verhalten
1. Du analysierst Intakes im Kontext der aktiven Guidelines des Unternehmens
2. Du identifizierst Compliance-Lücken, fehlende Anforderungen und Risiken
3. Du schlägst konkrete Verbesserungen vor
4. Du kannst Änderungen an bestehenden Guidelines vorschlagen wenn ein Intake zeigt dass etwas fehlt

## WICHTIG: Guideline-Änderungsvorschläge
Wenn du feststellst dass eine bestehende Guideline angepasst werden sollte (z.B. weil der Intake einen Aspekt aufzeigt der nicht abgedeckt ist), antworte mit einem speziellen Block:

\`\`\`guideline-change
{
  "guideline_id": "UUID der zu ändernden Guideline",
  "guideline_name": "Name der Guideline",
  "change_reason": "Begründung warum die Änderung nötig ist",
  "proposed_changes": {
    "content_markdown": "Neuer vollständiger Markdown-Inhalt (oder null wenn nicht geändert)",
    "risk_categories": ["Aktualisierte Risikokategorien"],
    "severity": "Neuer Schweregrad (oder null wenn nicht geändert)"
  }
}
\`\`\`

Der Architekt kann diese Änderung dann mit einem Klick übernehmen. Die Änderung wird versioniert mit Wer/Wann/Warum.

## Compliance-Prüfung
Wenn der User nach einer Compliance-Prüfung fragt, analysiere den Intake gegen ALLE aktiven Guidelines und gib eine strukturierte Bewertung:
- ✅ Konform: Guideline ist erfüllt
- ⚠️ Teilweise: Nachbesserung nötig
- ❌ Nicht konform: Dringende Maßnahmen erforderlich
- 📋 Nicht anwendbar: Guideline gilt nicht für diesen Intake

## Ausgabeformat für Intake-Verfeinerungen
Wenn du Verbesserungen am Intake vorschlägst, gib einen Block aus:

\`\`\`intake-update
{
  "suggested_additions": ["Neue Anforderung 1", "Neue Anforderung 2"],
  "risk_flags": ["Risiko 1", "Risiko 2"],
  "compliance_status": "compliant|partially_compliant|non_compliant",
  "missing_requirements": ["Fehlende Anforderung 1"]
}
\`\`\`

## Wichtig
- Alle Ausgaben auf DEUTSCH
- Sei konkret und praxisorientiert
- Referenziere die spezifischen Guidelines des Unternehmens
- Bei Änderungsvorschlägen: Sei präzise und begründe WARUM`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json();
    const mode = context?.mode || "guideline"; // "guideline" or "intake"

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let additionalContext = "";

    // Always load guidelines for context
    if (context?.includeExistingGuidelines || mode === "intake") {
      const { data: guidelines } = await supabase
        .from("guidelines")
        .select("id, name, compliance_framework, severity, type, content_markdown, risk_categories")
        .eq("is_active", true)
        .limit(50);

      if (guidelines && guidelines.length > 0) {
        if (mode === "intake") {
          additionalContext += `\n\n## AKTIVE GUIDELINES DES UNTERNEHMENS\nFolgende Guidelines sind aktiv und müssen bei der Compliance-Prüfung bewertet werden:\n\n`;
          for (const g of guidelines) {
            additionalContext += `### [${g.id}] ${g.compliance_framework?.toUpperCase()} — ${g.name} (${g.severity})\nTyp: ${g.type}\nRisiken: ${(g.risk_categories || []).join(", ")}\n${g.content_markdown?.substring(0, 600)}...\n\n`;
          }
        } else {
          additionalContext += `\n\nBereits existierende Guidelines (vermeide Duplikate):\n${guidelines
            .map((g: any) => `- [${g.compliance_framework}] ${g.name} (${g.severity}, ${g.type})`)
            .join("\n")}`;
        }
      }
    }

    // Load intake context if in intake mode
    if (mode === "intake" && context?.intakeId) {
      const { data: intake } = await supabase
        .from("intakes")
        .select("*")
        .eq("id", context.intakeId)
        .single();

      if (intake) {
        additionalContext += `\n\n## AKTUELLER INTAKE\n- **Titel**: ${intake.title}\n- **Status**: ${intake.status}\n- **Kategorie**: ${intake.category || "Nicht angegeben"}\n- **Value Stream**: ${intake.value_stream || "Nicht angegeben"}\n- **Priorität**: ${intake.priority || "Nicht angegeben"}\n`;
      }

      // Load spec if exists
      const { data: spec } = await supabase
        .from("spec_documents")
        .select("structured_json, markdown")
        .eq("intake_id", context.intakeId)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (spec) {
        const specJson = spec.structured_json as any;
        additionalContext += `\n## SPEZIFIKATION DES INTAKES\n`;
        if (specJson?.problemStatement) additionalContext += `**Problem**: ${specJson.problemStatement}\n`;
        if (specJson?.goals?.length) additionalContext += `**Ziele**: ${specJson.goals.join("; ")}\n`;
        if (specJson?.dataClassification) additionalContext += `**Datenklassifikation**: ${specJson.dataClassification}\n`;
        if (specJson?.integrations?.length) additionalContext += `**Integrationen**: ${specJson.integrations.map((i: any) => `${i.system} (${i.type})`).join(", ")}\n`;
        if (specJson?.risks?.length) additionalContext += `**Risiken**: ${specJson.risks.map((r: any) => r.description).join("; ")}\n`;
        if (specJson?.nfrs) additionalContext += `**NFRs**: Verfügbarkeit: ${specJson.nfrs.availability || "N/A"}, Audit: ${specJson.nfrs.auditability || false}\n`;
        if (specJson?.complianceAssessment?.length) {
          additionalContext += `**Compliance-Bewertung aus Spec**: ${JSON.stringify(specJson.complianceAssessment).substring(0, 500)}\n`;
        }
        if (spec.markdown) additionalContext += `\n**Vollständige Spec (Markdown)**:\n${spec.markdown.substring(0, 2000)}\n`;
      }

      // Load transcript
      const { data: transcripts } = await supabase
        .from("transcripts")
        .select("speaker, message")
        .eq("intake_id", context.intakeId)
        .order("timestamp", { ascending: true })
        .limit(50);

      if (transcripts && transcripts.length > 0) {
        additionalContext += `\n## INTERVIEW-TRANSKRIPT (Auszug)\n${transcripts.map((t: any) => `${t.speaker}: ${t.message}`).join("\n").substring(0, 3000)}\n`;
      }
    }

    const systemPrompt = (mode === "intake" ? INTAKE_SYSTEM_PROMPT : GUIDELINE_SYSTEM_PROMPT) + additionalContext;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit erreicht. Bitte versuche es in einer Minute erneut." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI-Credits aufgebraucht. Bitte Credits im Workspace aufladen." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "AI gateway Fehler" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat-guideline error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
