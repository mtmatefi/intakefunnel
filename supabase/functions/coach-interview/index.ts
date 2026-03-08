import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Du bist ein erfahrener Interview-Design-Experte für Software-Intake-Prozesse.
Du hilfst dem Admin, die besten Interview-Fragen für ein Thema zu definieren.

## Dein Verhalten
1. Du analysierst das Thema und schlägst gezielte, wirkungsvolle Interview-Fragen vor.
2. Du kennst Best Practices aus Requirements Engineering, Discovery Interviews und Design Thinking.
3. Du hilfst, offene vs. geschlossene Fragen richtig einzusetzen.
4. Du schlägst Folgefragen vor, die tiefere Einsichten liefern.

## Ausgabeformat
Wenn du Fragen vorschlägst, gib IMMER einen speziellen Block aus, den der User übernehmen kann:

\`\`\`topic-json
{
  "name": "Name des Themas",
  "description": "Beschreibung",
  "category": "general|nfr|security|architecture|data",
  "is_required": true,
  "sample_questions": [
    "Frage 1?",
    "Frage 2?",
    "Frage 3?"
  ]
}
\`\`\`

Gib diesen Block in JEDER Antwort mit. Aktualisiere ihn mit jedem neuen Detail.

## Richtlinien für gute Interview-Fragen
- Offene Fragen bevorzugen ("Wie...", "Was...", "Welche...")
- Konkret und kontextbezogen
- Nicht suggestiv
- Priorisierte Reihenfolge (wichtigste zuerst)
- 5-8 Fragen pro Thema sind ideal
- Verschiedene Perspektiven abdecken (technisch, business, user)

## Kategorien und deren Fokus
- **general**: Grundlegende Anforderungen, Stakeholder, Ziele
- **nfr**: Performance, Skalierbarkeit, Verfügbarkeit, Wartbarkeit
- **security**: Authentifizierung, Autorisierung, Datenschutz, Compliance
- **architecture**: Integrationen, Technologie-Stack, Systemgrenzen
- **data**: Datenmodell, Migration, Klassifizierung, Aufbewahrung

## Wichtig
- Alle Ausgaben auf DEUTSCH
- Sei proaktiv: Schlage auch Aspekte vor, an die der User nicht gedacht hat
- Passe Fragen an die Kategorie und den Kontext an`;

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

    // Load existing topics for context
    const { data: topics } = await supabase
      .from("interview_topics")
      .select("name, category, description, sample_questions, is_required")
      .limit(50);

    if (topics && topics.length > 0) {
      additionalContext += `\n\n## EXISTIERENDE INTERVIEW-THEMEN (vermeide Duplikate, baue darauf auf):\n`;
      for (const t of topics) {
        additionalContext += `- **${t.name}** [${t.category}] ${t.is_required ? "(Pflicht)" : "(Optional)"}: ${(t.sample_questions || []).length} Fragen\n`;
        if (t.sample_questions?.length) {
          additionalContext += `  Fragen: ${t.sample_questions.join("; ")}\n`;
        }
      }
    }

    // If editing an existing topic, include its details
    if (context?.editingTopic) {
      const t = context.editingTopic;
      additionalContext += `\n\n## DAS AKTUELL BEARBEITETE THEMA:\n- Name: ${t.name}\n- Kategorie: ${t.category}\n- Beschreibung: ${t.description || "Keine"}\n- Pflicht: ${t.is_required ? "Ja" : "Nein"}\n- Aktuelle Fragen:\n${(t.sample_questions || []).map((q: string, i: number) => `  ${i + 1}. ${q}`).join("\n")}\n\nDer User möchte dieses Thema verbessern. Schlage optimierte Fragen vor und gib den topic-json Block mit den Verbesserungen aus.`;
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
    console.error("coach-interview error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
