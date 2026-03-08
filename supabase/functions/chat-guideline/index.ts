import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Du bist ein erfahrener Compliance-, Security-, Architecture- und DevOps-Experte.
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
- Referenziere relevante Standards (NIST, ISO, OWASP, TOGAF, etc.)
- Bei Security: Denke an OWASP Top 10, Zero Trust, NIST CSF
- Bei Architecture: Denke an TOGAF, C4, Arc42
- Bei DevOps: Denke an DORA Metrics, SRE, GitOps
- Bei Compliance: Denke an ITAR, EAR, DSGVO, ISO 27001`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Optionally fetch existing guidelines for context
    let guidelinesContext = "";
    if (context?.includeExistingGuidelines) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data: guidelines } = await supabase
        .from("guidelines")
        .select("name, compliance_framework, severity, type")
        .eq("is_active", true)
        .limit(50);

      if (guidelines && guidelines.length > 0) {
        guidelinesContext = `\n\nBereits existierende Guidelines im System (vermeide Duplikate):\n${guidelines
          .map((g) => `- [${g.compliance_framework}] ${g.name} (${g.severity}, ${g.type})`)
          .join("\n")}`;
      }
    }

    const systemMessage = SYSTEM_PROMPT + guidelinesContext;

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
            { role: "system", content: systemMessage },
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
