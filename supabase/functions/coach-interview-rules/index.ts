import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Du bist ein erfahrener Experte für Software-Intake-Prozesse und Interview-Design.
Du hilfst dem Admin, Interview-Regeln zu definieren – leichtgewichtige Anweisungen, die die KI während des Intake-Interviews befolgen soll.

## Was sind Interview-Regeln?
Interview-Regeln sind NICHT Compliance-Guidelines. Sie sind operative Anweisungen für den KI-Interviewer:
- "Immer nach dem Budget fragen"
- "Bei Cloud-Projekten nach dem bevorzugten Provider fragen"
- "NFR-Fragen nur stellen wenn Kategorie = 'Neuentwicklung'"
- "Bei Änderungsanfragen immer den Grund erfragen"
- "Maximal 3 Follow-up-Fragen pro Thema"

## Regel-Typen
- **general**: Allgemeine Interview-Regeln (z.B. Reihenfolge, Tonalität)
- **conditional**: Bedingte Regeln (z.B. "Wenn X, dann frage Y")
- **mandatory**: Pflicht-Checks (z.B. "Immer nach Stakeholdern fragen")
- **quality**: Qualitätssicherung (z.B. "Mindestens 3 konkrete Beispiele sammeln")

## Ausgabeformat
Wenn du eine Regel vorschlägst, gib IMMER diesen Block aus:

\`\`\`rule-json
{
  "name": "Name der Regel",
  "description": "Kurzbeschreibung",
  "rule_type": "general|conditional|mandatory|quality",
  "content_markdown": "## Regel\\n\\nDetaillierte Beschreibung der Regel in Markdown.\\n\\n### Wann anwenden\\n- Bedingung 1\\n- Bedingung 2\\n\\n### Beispiel\\nKonkretes Beispiel wie die Regel angewendet wird."
}
\`\`\`

Gib diesen Block in JEDER Antwort mit. Aktualisiere ihn mit jedem neuen Detail.

## Richtlinien
- Regeln sollen klar und eindeutig sein
- Vermeide Überlappungen mit bestehenden Regeln
- Regeln sollen für die KI umsetzbar sein
- Alle Ausgaben auf DEUTSCH
- Sei proaktiv: Schlage Regeln vor, an die der User nicht gedacht hat`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let additionalContext = "";

    // Load existing rules for context
    const { data: rules } = await supabase
      .from("interview_rules")
      .select("name, rule_type, description, content_markdown, is_active")
      .limit(50);

    if (rules && rules.length > 0) {
      additionalContext += `\n\n## EXISTIERENDE INTERVIEW-REGELN (vermeide Duplikate):\n`;
      for (const r of rules) {
        additionalContext += `- **${r.name}** [${r.rule_type}] ${r.is_active ? "(Aktiv)" : "(Inaktiv)"}: ${r.description || ""}\n`;
      }
    }

    // Load interview topics for context
    const { data: topics } = await supabase
      .from("interview_topics")
      .select("name, category, is_required")
      .limit(50);

    if (topics && topics.length > 0) {
      additionalContext += `\n\n## INTERVIEW-THEMEN (für Kontext):\n`;
      for (const t of topics) {
        additionalContext += `- ${t.name} [${t.category}] ${t.is_required ? "(Pflicht)" : "(Optional)"}\n`;
      }
    }

    // If editing an existing rule
    if (context?.editingRule) {
      const r = context.editingRule;
      additionalContext += `\n\n## DIE AKTUELL BEARBEITETE REGEL:\n- Name: ${r.name}\n- Typ: ${r.rule_type}\n- Beschreibung: ${r.description || "Keine"}\n- Inhalt:\n${r.content_markdown}\n\nDer User möchte diese Regel verbessern. Schlage eine optimierte Version vor.`;
    }

    const systemPrompt = SYSTEM_PROMPT + additionalContext;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

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
    console.error("coach-interview-rules error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
