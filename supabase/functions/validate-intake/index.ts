import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ValidationRequest {
  questionKey: string;
  questionText: string;
  userAnswer: string;
  category: string;
  previousAnswers: Record<string, string>;
  language: 'de' | 'en';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { questionKey, questionText, userAnswer, category, previousAnswers, language = 'de' } = await req.json() as ValidationRequest;
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`Validating answer for question: ${questionKey} in language: ${language}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch active guidelines for compliance-aware validation
    const { data: guidelines } = await supabase
      .from('guidelines')
      .select('name, compliance_framework, severity, risk_categories')
      .eq('is_active', true);

    const guidelinesContext = guidelines && guidelines.length > 0
      ? `\n\nAKTIVE COMPLIANCE-GUIDELINES im Unternehmen:\n${guidelines.map((g: any) =>
          `- [${g.compliance_framework?.toUpperCase()}] ${g.name} (${g.severity}) – Risiken: ${(g.risk_categories || []).join(', ')}`
        ).join('\n')}\n\nWenn die Antwort des Benutzers Compliance-relevante Aspekte berührt, prüfe gegen diese Guidelines.`
      : '';

    // Fetch initiative links from Strategy Sculptor for live matching
    const { data: initiatives } = await supabase
      .from('initiative_intake_links')
      .select('id, initiative_id, initiative_title, initiative_data, source_app, tenant_id')
      .is('intake_id', null)
      .order('created_at', { ascending: false })
      .limit(50);

    // Also fetch linked initiatives (already assigned to intakes) for context
    const { data: linkedInitiatives } = await supabase
      .from('initiative_intake_links')
      .select('initiative_id, initiative_title, initiative_data')
      .not('intake_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(30);

    let initiativesContext = '';
    if ((initiatives && initiatives.length > 0) || (linkedInitiatives && linkedInitiatives.length > 0)) {
      initiativesContext = '\n\n## STRATEGY SCULPTOR – VERFÜGBARE INITIATIVEN & EPICS\n';
      initiativesContext += 'Folgende strategische Initiativen sind im System. Prüfe ob die Benutzerantworten zu einer dieser Initiativen passen:\n\n';
      
      if (initiatives && initiatives.length > 0) {
        initiativesContext += '### Unverknüpfte Initiativen (können diesem Intake zugeordnet werden):\n';
        for (const init of initiatives) {
          const data = init.initiative_data || {};
          initiativesContext += `- **[${init.initiative_id}] ${init.initiative_title}**`;
          if (data.description) initiativesContext += ` – ${String(data.description).substring(0, 200)}`;
          if (data.value_stream) initiativesContext += ` (Value Stream: ${data.value_stream})`;
          if (data.type) initiativesContext += ` [Typ: ${data.type}]`;
          initiativesContext += `\n`;
        }
      }

      if (linkedInitiatives && linkedInitiatives.length > 0) {
        initiativesContext += '\n### Bereits verknüpfte Initiativen (Kontext):\n';
        for (const init of linkedInitiatives) {
          initiativesContext += `- ${init.initiative_title}\n`;
        }
      }

      initiativesContext += '\nWenn du einen Match findest, gib die initiative_id und den Titel im matchedInitiatives-Array zurück.\n';
    }

    const systemPrompt = language === 'en' 
      ? buildEnglishPrompt(guidelinesContext, initiativesContext)
      : buildGermanPrompt(guidelinesContext, initiativesContext);

    const allAnswersContext = Object.entries(previousAnswers).map(([k, v]) => `- ${k}: ${v}`).join('\n') || (language === 'de' ? 'Keine bisherigen Antworten' : 'No previous answers');

    const userPrompt = language === 'en'
      ? `Category: ${category}\nQuestion: ${questionText}\nUser answer: ${userAnswer}\n\nPrevious answers in this session:\n${allAnswersContext}\n\nAnalyze the answer, classify the intake type, and check for initiative matches.`
      : `Kategorie: ${category}\nFrage: ${questionText}\nBenutzerantwort: ${userAnswer}\n\nBisherige Antworten in dieser Session:\n${allAnswersContext}\n\nAnalysiere die Antwort, klassifiziere den Intake-Typ, und prüfe auf Initiative-Matches.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from AI');
    }

    console.log('AI validation response:', content.substring(0, 500));

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid JSON response from AI');
    }

    const validation = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(validation), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in validate-intake:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      isComplete: true,
      quality: 'good',
      followUpQuestion: null,
      suggestions: [],
      enrichedAnswer: null,
      missingAspects: [],
      complianceFlags: [],
      classifiedType: null,
      classificationConfidence: null,
      classificationReason: null,
      matchedInitiatives: [],
      adaptiveQuestions: [],
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildGermanPrompt(guidelinesContext: string, initiativesContext: string): string {
  return `Du bist ein erfahrener Solution Architect und Business Analyst, der Software-Anforderungen sammelt.
Deine Aufgabe ist es, Benutzerantworten zu validieren, den Intake-Typ zu klassifizieren und strategische Matches zu finden.
WICHTIG: Antworte IMMER auf Deutsch!
${guidelinesContext}
${initiativesContext}

Antworte IMMER im folgenden JSON-Format:
{
  "isComplete": boolean,
  "quality": "excellent" | "good" | "needs_improvement" | "insufficient",
  "followUpQuestion": string | null,
  "suggestions": string[],
  "enrichedAnswer": string | null,
  "missingAspects": string[],
  "complianceFlags": string[],
  "classifiedType": "initiative" | "value_stream_epic" | "epic" | "feature" | null,
  "classificationConfidence": "high" | "medium" | "low" | null,
  "classificationReason": string | null,
  "matchedInitiatives": [
    {
      "initiative_id": "ID aus der Liste",
      "initiative_title": "Titel",
      "match_score": "high" | "medium" | "low",
      "match_reason": "Warum passt das zusammen?"
    }
  ],
  "adaptiveQuestions": [
    {
      "question": "Kontextbezogene Zusatzfrage basierend auf dem Match",
      "reason": "Warum ist diese Frage wichtig im Kontext der Initiative?"
    }
  ]
}

## Klassifizierungsregeln:
- **initiative**: Strategische Unternehmensinitiative mit breitem Scope, mehrere Value Streams betroffen, langfristiger Horizont
- **value_stream_epic**: Großes Vorhaben innerhalb eines Value Streams, mehrere Epics/Features, klar abgrenzbarer Geschäftsbereich
- **epic**: Abgrenzbares Arbeitspaket mit mehreren Features/User Stories, typisch 1-3 Monate Umsetzungsdauer
- **feature**: Einzelne Funktionalität oder Verbesserung, typisch in Wochen umsetzbar

Klassifiziere basierend auf: Scope, Anzahl betroffener User/Systeme, Komplexität, Zeithorizont, strategische Bedeutung.
Aktualisiere die Klassifizierung mit jeder neuen Antwort - sie wird präziser je mehr Kontext du hast.

## Initiative-Matching:
Prüfe ob die beschriebenen Anforderungen zu bestehenden Initiativen passen. Berücksichtige:
- Ähnliche Problemstellung oder Ziele
- Gleicher Value Stream oder Geschäftsbereich
- Technologische Überschneidungen
- Thematische Verwandtschaft

## Adaptive Fragen:
Wenn du einen Initiative-Match findest, generiere 1-2 zusätzliche Fragen die im Kontext der Initiative relevant sind:
- Abgrenzung zur existierenden Initiative
- Synergien und Abhängigkeiten
- Strategische Priorisierung

Sei freundlich aber gründlich.`;
}

function buildEnglishPrompt(guidelinesContext: string, initiativesContext: string): string {
  return `You are an experienced Solution Architect and Business Analyst gathering software requirements.
Your task is to validate user answers, classify the intake type, and find strategic matches.
IMPORTANT: Always respond in English!
${guidelinesContext}
${initiativesContext}

Always respond in the following JSON format:
{
  "isComplete": boolean,
  "quality": "excellent" | "good" | "needs_improvement" | "insufficient",
  "followUpQuestion": string | null,
  "suggestions": string[],
  "enrichedAnswer": string | null,
  "missingAspects": string[],
  "complianceFlags": string[],
  "classifiedType": "initiative" | "value_stream_epic" | "epic" | "feature" | null,
  "classificationConfidence": "high" | "medium" | "low" | null,
  "classificationReason": string | null,
  "matchedInitiatives": [
    {
      "initiative_id": "ID from the list",
      "initiative_title": "Title",
      "match_score": "high" | "medium" | "low",
      "match_reason": "Why does this match?"
    }
  ],
  "adaptiveQuestions": [
    {
      "question": "Context-aware additional question based on the match",
      "reason": "Why is this question important in the context of the initiative?"
    }
  ]
}

## Classification rules:
- **initiative**: Strategic enterprise initiative with broad scope, multiple value streams affected, long-term horizon
- **value_stream_epic**: Large undertaking within a value stream, multiple epics/features, clearly defined business area
- **epic**: Bounded work package with multiple features/user stories, typically 1-3 months implementation
- **feature**: Single functionality or improvement, typically implementable in weeks

Classify based on: scope, number of affected users/systems, complexity, time horizon, strategic importance.
Update classification with each new answer - it becomes more precise with more context.

## Initiative Matching:
Check if requirements match existing initiatives. Consider: similar problems/goals, same value stream, technology overlaps, thematic relationships.

## Adaptive Questions:
When you find an initiative match, generate 1-2 additional questions relevant in the context:
- Differentiation from existing initiative
- Synergies and dependencies
- Strategic prioritization

Be friendly but thorough.`;
}
