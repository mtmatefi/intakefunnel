import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Fetch active guidelines for compliance-aware validation
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: guidelines } = await supabase
      .from('guidelines')
      .select('name, compliance_framework, severity, risk_categories')
      .eq('is_active', true);

    const guidelinesContext = guidelines && guidelines.length > 0
      ? `\n\nAKTIVE COMPLIANCE-GUIDELINES im Unternehmen:\n${guidelines.map((g: any) =>
          `- [${g.compliance_framework?.toUpperCase()}] ${g.name} (${g.severity}) – Risiken: ${(g.risk_categories || []).join(', ')}`
        ).join('\n')}\n\nWenn die Antwort des Benutzers Compliance-relevante Aspekte berührt (Daten, Security, Architektur, Export, Regulierung), prüfe gegen diese Guidelines und stelle bei Bedarf Nachfragen zu fehlenden Compliance-Informationen.`
      : '';

    const systemPromptDE = `Du bist ein erfahrener Solution Architect und Business Analyst, der Software-Anforderungen sammelt. 
Deine Aufgabe ist es, Benutzerantworten zu validieren und bei Bedarf Nachfragen zu stellen.
WICHTIG: Antworte IMMER auf Deutsch!
${guidelinesContext}

Antworte IMMER im folgenden JSON-Format:
{
  "isComplete": boolean,
  "quality": "excellent" | "good" | "needs_improvement" | "insufficient",
  "followUpQuestion": string | null,
  "suggestions": string[],
  "enrichedAnswer": string | null,
  "missingAspects": string[],
  "complianceFlags": string[]
}

Regeln:
- isComplete: true wenn die Antwort ausreichend detailliert ist
- quality: Bewertung der Antwortqualität
- followUpQuestion: Eine spezifische Nachfrage wenn wichtige Infos fehlen (null wenn komplett). Bei Compliance-relevanten Antworten IMMER nach fehlenden regulatorischen/sicherheitsrelevanten Details fragen.
- suggestions: Konkrete Verbesserungsvorschläge (max 3)
- enrichedAnswer: Falls du die Antwort für Jira aufbereiten kannst, eine verbesserte Version
- missingAspects: Was fehlt noch für eine vollständige Spezifikation
- complianceFlags: Welche Compliance-Guidelines sind durch diese Antwort betroffen (leeres Array wenn keine)

Sei freundlich aber gründlich. Stelle Nachfragen insbesondere wenn Compliance-relevante Aspekte fehlen.`;

    const systemPromptEN = `You are an experienced Solution Architect and Business Analyst gathering software requirements. 
Your task is to validate user answers and ask follow-up questions when needed.
IMPORTANT: Always respond in English!
${guidelinesContext}

Always respond in the following JSON format:
{
  "isComplete": boolean,
  "quality": "excellent" | "good" | "needs_improvement" | "insufficient",
  "followUpQuestion": string | null,
  "suggestions": string[],
  "enrichedAnswer": string | null,
  "missingAspects": string[],
  "complianceFlags": string[]
}

Rules:
- isComplete: true if the answer is sufficiently detailed
- quality: Assessment of answer quality
- followUpQuestion: A specific follow-up if important info is missing (null if complete). For compliance-relevant answers, ALWAYS ask about missing regulatory/security details.
- suggestions: Concrete improvement suggestions (max 3)
- enrichedAnswer: If you can enhance the answer for Jira, an improved version
- missingAspects: What's still missing for a complete specification
- complianceFlags: Which compliance guidelines are affected by this answer (empty array if none)

Be friendly but thorough. Ask follow-ups especially when compliance-relevant aspects are missing.`;

    const systemPrompt = language === 'en' ? systemPromptEN : systemPromptDE;

    const userPromptDE = `Kategorie: ${category}
Frage: ${questionText}
Benutzerantwort: ${userAnswer}

Bisherige Antworten in dieser Session:
${Object.entries(previousAnswers).map(([k, v]) => `- ${k}: ${v}`).join('\n') || 'Keine bisherigen Antworten'}

Analysiere die Antwort und gib Feedback auf Deutsch.`;

    const userPromptEN = `Category: ${category}
Question: ${questionText}
User answer: ${userAnswer}

Previous answers in this session:
${Object.entries(previousAnswers).map(([k, v]) => `- ${k}: ${v}`).join('\n') || 'No previous answers'}

Analyze the answer and provide feedback in English.`;

    const userPrompt = language === 'en' ? userPromptEN : userPromptDE;

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
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
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

    console.log('AI validation response:', content);

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
      missingAspects: []
    }), {
      status: 200, // Return 200 with fallback to not block the user
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
