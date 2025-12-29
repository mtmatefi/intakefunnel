import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { questionKey, questionText, userAnswer, category, previousAnswers } = await req.json() as ValidationRequest;
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`Validating answer for question: ${questionKey}`);

    const systemPrompt = `Du bist ein erfahrener Solution Architect und Business Analyst, der Software-Anforderungen sammelt. 
Deine Aufgabe ist es, Benutzerantworten zu validieren und bei Bedarf Nachfragen zu stellen.

Antworte IMMER im folgenden JSON-Format:
{
  "isComplete": boolean,
  "quality": "excellent" | "good" | "needs_improvement" | "insufficient",
  "followUpQuestion": string | null,
  "suggestions": string[],
  "enrichedAnswer": string | null,
  "missingAspects": string[]
}

Regeln:
- isComplete: true wenn die Antwort ausreichend detailliert ist
- quality: Bewertung der Antwortqualität
- followUpQuestion: Eine spezifische Nachfrage wenn wichtige Infos fehlen (null wenn komplett)
- suggestions: Konkrete Verbesserungsvorschläge (max 3)
- enrichedAnswer: Falls du die Antwort für Jira aufbereiten kannst, eine verbesserte Version
- missingAspects: Was fehlt noch für eine vollständige Spezifikation

Sei freundlich aber gründlich. Stelle Nachfragen nur wenn wirklich wichtig.`;

    const userPrompt = `Kategorie: ${category}
Frage: ${questionText}
Benutzerantwort: ${userAnswer}

Bisherige Antworten in dieser Session:
${Object.entries(previousAnswers).map(([k, v]) => `- ${k}: ${v}`).join('\n') || 'Keine bisherigen Antworten'}

Analysiere die Antwort und gib Feedback.`;

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
