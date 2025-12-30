import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Routing score calculation types and functions
type DeliveryPath = "BUY" | "CONFIG" | "AI_DISPOSABLE" | "PRODUCT_GRADE" | "CRITICAL";
type DataClassification = "public" | "internal" | "confidential" | "restricted";

interface ScoreBreakdown {
  dataComplexity: number;
  integrationComplexity: number;
  userScale: number;
  securityRequirements: number;
  availabilityRequirements: number;
  customizationNeeds: number;
  timeToMarket: number;
}

interface RoutingResult {
  path: DeliveryPath;
  score: number;
  breakdown: ScoreBreakdown;
  explanation: string;
}

function calculateRoutingScore(spec: any): RoutingResult {
  const breakdown: ScoreBreakdown = {
    dataComplexity: calculateDataComplexity(spec),
    integrationComplexity: calculateIntegrationComplexity(spec),
    userScale: calculateUserScale(spec),
    securityRequirements: calculateSecurityRequirements(spec),
    availabilityRequirements: calculateAvailabilityRequirements(spec),
    customizationNeeds: calculateCustomizationNeeds(spec),
    timeToMarket: 50,
  };

  const totalScore = Object.values(breakdown).reduce((a, b) => a + b, 0) / Object.keys(breakdown).length;
  const path = determinePathFromScore(breakdown, spec);
  const explanation = generateRoutingExplanation(path, breakdown, spec);

  return { path, score: Math.round(totalScore), breakdown, explanation };
}

function calculateDataComplexity(spec: any): number {
  let score = 20;
  score += (spec.dataTypes?.length || 0) * 5;
  const classificationScores: Record<DataClassification, number> = {
    public: 0, internal: 10, confidential: 25, restricted: 40,
  };
  score += classificationScores[spec.dataClassification as DataClassification] || 0;
  score += (spec.privacyRequirements?.length || 0) * 5;
  return Math.min(score, 100);
}

function calculateIntegrationComplexity(spec: any): number {
  let score = 10;
  (spec.integrations || []).forEach((int: any) => {
    const typeScores: Record<string, number> = { read: 10, write: 15, bidirectional: 25 };
    score += typeScores[int.type] || 10;
    if (int.priority === "must") score += 10;
  });
  return Math.min(score, 100);
}

function calculateUserScale(spec: any): number {
  const totalUsers = (spec.users || []).reduce((sum: number, u: any) => sum + (parseInt(u.count) || 0), 0);
  if (totalUsers < 10) return 10;
  if (totalUsers < 50) return 25;
  if (totalUsers < 200) return 50;
  if (totalUsers < 1000) return 75;
  return 100;
}

function calculateSecurityRequirements(spec: any): number {
  let score = 10;
  const classificationScores: Record<DataClassification, number> = {
    public: 0, internal: 15, confidential: 40, restricted: 70,
  };
  score += classificationScores[spec.dataClassification as DataClassification] || 0;
  if (spec.nfrs?.auditability) score += 15;
  return Math.min(score, 100);
}

function calculateAvailabilityRequirements(spec: any): number {
  const availability = (spec.nfrs?.availability || "").toLowerCase();
  if (availability.includes("24/7") || availability.includes("99.9")) return 90;
  if (availability.includes("99.5")) return 60;
  if (availability.includes("business hours")) return 30;
  return 40;
}

function calculateCustomizationNeeds(spec: any): number {
  let score = 20;
  score += (spec.uxNeeds || []).filter((u: any) => u.priority === "must").length * 10;
  score += Math.min((spec.acceptanceCriteria?.length || 0) * 5, 30);
  return Math.min(score, 100);
}

function determinePathFromScore(breakdown: ScoreBreakdown, spec: any): DeliveryPath {
  const avgScore = Object.values(breakdown).reduce((a, b) => a + b, 0) / Object.keys(breakdown).length;

  if (spec.dataClassification === "restricted" || breakdown.securityRequirements > 80 || breakdown.availabilityRequirements > 85) {
    return "CRITICAL";
  }
  if (avgScore > 60 || breakdown.integrationComplexity > 70 || breakdown.customizationNeeds > 70) {
    return "PRODUCT_GRADE";
  }
  if (avgScore < 35 && breakdown.integrationComplexity < 30 && breakdown.userScale < 30 && breakdown.timeToMarket > 70) {
    return "AI_DISPOSABLE";
  }
  if (breakdown.customizationNeeds < 30 && breakdown.integrationComplexity < 40) {
    return "BUY";
  }
  return "CONFIG";
}

function getLevel(score: number): string {
  if (score < 30) return "Low";
  if (score < 60) return "Medium";
  return "High";
}

function generateRoutingExplanation(path: DeliveryPath, breakdown: ScoreBreakdown, spec: any): string {
  const pathLabels: Record<DeliveryPath, string> = {
    BUY: "Buy (Commercial Off-the-Shelf)",
    CONFIG: "Configure (Low-Code Platform)",
    AI_DISPOSABLE: "AI Disposable",
    PRODUCT_GRADE: "Product Grade Development",
    CRITICAL: "Critical System Development",
  };

  let explanation = `## Routing Recommendation: ${pathLabels[path]}\n\n`;
  explanation += `### Score Summary\n\n`;
  explanation += `| Factor | Score | Level |\n|--------|-------|-------|\n`;
  explanation += `| Data Complexity | ${breakdown.dataComplexity} | ${getLevel(breakdown.dataComplexity)} |\n`;
  explanation += `| Integration Complexity | ${breakdown.integrationComplexity} | ${getLevel(breakdown.integrationComplexity)} |\n`;
  explanation += `| User Scale | ${breakdown.userScale} | ${getLevel(breakdown.userScale)} |\n`;
  explanation += `| Security Requirements | ${breakdown.securityRequirements} | ${getLevel(breakdown.securityRequirements)} |\n`;
  explanation += `| Availability Requirements | ${breakdown.availabilityRequirements} | ${getLevel(breakdown.availabilityRequirements)} |\n`;
  explanation += `| Customization Needs | ${breakdown.customizationNeeds} | ${getLevel(breakdown.customizationNeeds)} |\n\n`;

  explanation += `### Key Factors\n\n`;
  if (path === "CONFIG") {
    explanation += `- Standard use case suitable for low-code approach\n- Moderate integration complexity\n- Reasonable time-to-market expectations\n`;
  } else if (path === "PRODUCT_GRADE") {
    explanation += `- Complex customization requirements\n- Multiple integrations needed\n- Long-term maintainability important\n`;
  } else if (path === "CRITICAL") {
    explanation += `- High security/compliance requirements\n- Mission-critical availability needed\n- Requires extensive testing and validation\n`;
  } else if (path === "AI_DISPOSABLE") {
    explanation += `- Simple, well-defined scope\n- Limited lifespan acceptable\n- Speed to delivery is priority\n`;
  } else if (path === "BUY") {
    explanation += `- Standard requirements that COTS can satisfy\n- Limited customization needed\n- Cost-effective for scope\n`;
  }

  if (spec.risks?.length) {
    explanation += `\n### Identified Risks\n\n`;
    spec.risks.forEach((risk: any) => {
      explanation += `- **${risk.description}** (${risk.probability} probability, ${risk.impact} impact)\n`;
    });
  }

  return explanation;
}

const systemPrompt = `Du bist ein Software-Anforderungsanalyst. Deine Aufgabe ist es, Interview-Transkripte zu analysieren und strukturierte Spezifikationen zu erstellen.

WICHTIG: Alle Ausgaben müssen auf DEUTSCH sein!

Gegeben ein Gesprächstranskript zwischen einem Benutzer und einem KI-Assistenten über einen Software-Bedarf, extrahiere und generiere:

1. Problemstellung - Klare Zusammenfassung des Problems
2. Aktueller Prozess - Wie die Dinge heute funktionieren
3. Schmerzpunkte - Liste von Frustrationen und Problemen
4. Ziele - Was Erfolg bedeutet
5. Einschränkungen - Limitierungen
6. Benutzer - Wer wird dies nutzen (Personas, Anzahl, technisches Niveau)
7. Häufigkeit & Volumen - Wie oft und wie viel
8. Datentypen - Welche Daten sind betroffen
9. Datenklassifizierung - public/internal/confidential/restricted
10. Aufbewahrungsfrist - Wie lange Daten aufbewahrt werden
11. Datenschutzanforderungen - Datenschutzbedürfnisse
12. Integrationen - Systeme zur Verbindung (System, Typ, Priorität)
13. UX-Anforderungen - Schnittstellenanforderungen (mobil, offline, etc.)
14. NFRs - Nicht-funktionale Anforderungen (Verfügbarkeit, Antwortzeit, etc.)
15. Akzeptanzkriterien - Given-When-Then Testszenarien
16. Testvorschläge - Arten von benötigten Tests
17. Risiken - Potenzielle Probleme mit Wahrscheinlichkeit und Auswirkung
18. Annahmen - Dinge, die als wahr angenommen werden
19. Offene Fragen - Dinge, die noch geklärt werden müssen

Sei gründlich aber präzise. Konzentriere dich auf umsetzbare, spezifische Details. ALLE AUSGABEN AUF DEUTSCH!`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { intakeId } = await req.json();
    
    if (!intakeId) {
      throw new Error("intakeId is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch transcript
    const { data: transcripts, error: transcriptError } = await supabase
      .from("transcripts")
      .select("*")
      .eq("intake_id", intakeId)
      .order("timestamp", { ascending: true });

    if (transcriptError) {
      throw new Error(`Failed to fetch transcript: ${transcriptError.message}`);
    }

    if (!transcripts || transcripts.length === 0) {
      throw new Error("No transcript found for this intake");
    }

    // Format transcript for AI
    const formattedTranscript = transcripts
      .map((t) => `${t.speaker}: ${t.message}`)
      .join("\n\n");

    console.log("Generating spec for intake:", intakeId);
    console.log("Transcript length:", formattedTranscript.length);

    // Call Lovable AI with tool calling for structured output
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here is the interview transcript:\n\n${formattedTranscript}\n\nPlease analyze this and generate a structured specification.` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_spec",
              description: "Generate a structured software specification from interview transcript",
              parameters: {
                type: "object",
                properties: {
                  problemStatement: { type: "string", description: "Clear summary of the problem" },
                  currentProcess: { type: "string", description: "How things work today" },
                  painPoints: { type: "array", items: { type: "string" }, description: "List of pain points" },
                  goals: { type: "array", items: { type: "string" }, description: "Success criteria" },
                  constraints: { type: "array", items: { type: "string" }, description: "Limitations" },
                  users: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        persona: { type: "string" },
                        count: { type: "string" },
                        techLevel: { type: "string" },
                      },
                      required: ["persona", "count", "techLevel"],
                    },
                  },
                  frequency: { type: "string" },
                  volumes: { type: "string" },
                  environments: { type: "array", items: { type: "string" } },
                  dataTypes: { type: "array", items: { type: "string" } },
                  dataClassification: { type: "string", enum: ["public", "internal", "confidential", "restricted"] },
                  retentionPeriod: { type: "string" },
                  privacyRequirements: { type: "array", items: { type: "string" } },
                  integrations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        system: { type: "string" },
                        type: { type: "string" },
                        priority: { type: "string", enum: ["must", "should", "could"] },
                      },
                      required: ["system", "type", "priority"],
                    },
                  },
                  uxNeeds: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string" },
                        description: { type: "string" },
                        priority: { type: "string", enum: ["must", "should", "could"] },
                      },
                      required: ["type", "description", "priority"],
                    },
                  },
                  nfrs: {
                    type: "object",
                    properties: {
                      availability: { type: "string" },
                      responseTime: { type: "string" },
                      throughput: { type: "string" },
                      auditability: { type: "boolean" },
                      supportHours: { type: "string" },
                      dataRetention: { type: "string" },
                    },
                  },
                  acceptanceCriteria: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        storyRef: { type: "string" },
                        given: { type: "string" },
                        when: { type: "string" },
                        then: { type: "string" },
                      },
                      required: ["id", "storyRef", "given", "when", "then"],
                    },
                  },
                  testSuggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        type: { type: "string" },
                        description: { type: "string" },
                        priority: { type: "string" },
                      },
                      required: ["id", "type", "description", "priority"],
                    },
                  },
                  risks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        description: { type: "string" },
                        probability: { type: "string" },
                        impact: { type: "string" },
                        mitigation: { type: "string" },
                      },
                      required: ["id", "description", "probability", "impact", "mitigation"],
                    },
                  },
                  assumptions: { type: "array", items: { type: "string" } },
                  openQuestions: { type: "array", items: { type: "string" } },
                },
                required: ["problemStatement", "currentProcess", "painPoints", "goals", "users", "dataClassification"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_spec" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log("AI response received");

    // Extract the structured spec from tool call
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "generate_spec") {
      throw new Error("Invalid AI response - no spec generated");
    }

    const structuredSpec = JSON.parse(toolCall.function.arguments);
    console.log("Parsed spec:", Object.keys(structuredSpec));

    // Get the intake to find requester_id for created_by
    const { data: intake, error: intakeError } = await supabase
      .from("intakes")
      .select("requester_id")
      .eq("id", intakeId)
      .single();

    if (intakeError) {
      throw new Error(`Failed to fetch intake: ${intakeError.message}`);
    }

    // Generate markdown version
    const markdown = generateMarkdown(structuredSpec);

    // Save spec to database
    const { data: savedSpec, error: saveError } = await supabase
      .from("spec_documents")
      .insert({
        intake_id: intakeId,
        structured_json: structuredSpec,
        markdown: markdown,
        created_by: intake.requester_id,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Failed to save spec:", saveError);
      throw new Error(`Failed to save spec: ${saveError.message}`);
    }

    // Update intake status
    await supabase
      .from("intakes")
      .update({ status: "spec_generated" })
      .eq("id", intakeId);

    console.log("Spec saved successfully:", savedSpec.id);

    // Calculate and save routing score
    const routingResult = calculateRoutingScore(structuredSpec);
    console.log("Routing score calculated:", routingResult.path, routingResult.score);

    const { data: savedRouting, error: routingError } = await supabase
      .from("routing_scores")
      .insert({
        intake_id: intakeId,
        path: routingResult.path,
        score: routingResult.score,
        score_json: routingResult.breakdown,
        explanation_markdown: routingResult.explanation,
      })
      .select()
      .single();

    if (routingError) {
      console.error("Failed to save routing score:", routingError);
      // Don't throw - spec was saved successfully
    } else {
      console.log("Routing score saved:", savedRouting.id);
    }

    // Auto-create or update Jira Product Discovery ticket
    let jiraResult = null;
    try {
      const JIRA_API_TOKEN = Deno.env.get('JIRA_API_TOKEN');
      const JIRA_BASE_URL = Deno.env.get('JIRA_BASE_URL');
      const JIRA_USER_EMAIL = Deno.env.get('JIRA_USER_EMAIL');
      
      if (JIRA_API_TOKEN && JIRA_BASE_URL && JIRA_USER_EMAIL) {
        const baseUrl = JIRA_BASE_URL.replace(/\/$/, '');
        const authHeader = 'Basic ' + btoa(`${JIRA_USER_EMAIL}:${JIRA_API_TOKEN}`);
        
        // Get intake with existing JPD key
        const { data: intakeData } = await supabase
          .from("intakes")
          .select("title, jpd_issue_key")
          .eq("id", intakeId)
          .single();
        
        const issueTitle = intakeData?.title || structuredSpec.problemStatement?.substring(0, 100) || "New Intake Request";
        const existingJpdKey = intakeData?.jpd_issue_key;
        
        // Build issue content
        const issueContent = {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: `Problem: ${structuredSpec.problemStatement}` }]
            },
            {
              type: 'heading',
              attrs: { level: 2 },
              content: [{ type: 'text', text: 'Ziele' }]
            },
            {
              type: 'bulletList',
              content: (structuredSpec.goals || []).map((goal: string) => ({
                type: 'listItem',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: goal }] }]
              }))
            },
            {
              type: 'heading',
              attrs: { level: 2 },
              content: [{ type: 'text', text: 'Benutzer' }]
            },
            {
              type: 'bulletList',
              content: (structuredSpec.users || []).map((u: any) => ({
                type: 'listItem',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: `${u.persona}: ${u.count} (${u.techLevel})` }] }]
              }))
            },
            {
              type: 'heading',
              attrs: { level: 2 },
              content: [{ type: 'text', text: 'Routing' }]
            },
            {
              type: 'paragraph',
              content: [{ type: 'text', text: `Pfad: ${routingResult.path} (Score: ${routingResult.score})` }]
            },
            {
              type: 'heading',
              attrs: { level: 2 },
              content: [{ type: 'text', text: 'Risiken' }]
            },
            {
              type: 'bulletList',
              content: (structuredSpec.risks || []).slice(0, 5).map((r: any) => ({
                type: 'listItem',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: `${r.description} (${r.probability}/${r.impact})` }] }]
              }))
            }
          ]
        };
        
        if (existingJpdKey) {
          // UPDATE existing Jira ticket
          console.log(`Updating existing JPD ticket: ${existingJpdKey}`);
          
          const updatePayload = {
            fields: {
              summary: `[${routingResult.path}] ${issueTitle}`,
              description: issueContent,
              labels: ['ai-intake-router', routingResult.path.toLowerCase().replace('_', '-')],
            }
          };

          const updateResponse = await fetch(`${baseUrl}/rest/api/3/issue/${existingJpdKey}`, {
            method: 'PUT',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify(updatePayload),
          });

          if (updateResponse.ok || updateResponse.status === 204) {
            console.log(`Updated JPD ticket: ${existingJpdKey}`);
            
            // Update jira_exports log
            await supabase
              .from("jira_exports")
              .upsert({
                intake_id: intakeId,
                jpd_issue_key: existingJpdKey,
                status: 'success',
                logs: [`✓ Updated JPD Idea: ${existingJpdKey}`],
              }, { onConflict: 'intake_id' });
            
            jiraResult = { jpdIssueKey: existingJpdKey, jiraBaseUrl: baseUrl, action: 'updated' };
          } else {
            const errorText = await updateResponse.text();
            console.error("Jira update error:", updateResponse.status, errorText);
          }
        } else {
          // CREATE new Jira ticket
          console.log("Creating new JPD ticket...");
          
          const createPayload = {
            fields: {
              project: { key: "IN" },
              summary: `[${routingResult.path}] ${issueTitle}`,
              description: issueContent,
              issuetype: { name: 'Idea' },
              labels: ['ai-intake-router', routingResult.path.toLowerCase().replace('_', '-')],
            }
          };

          const jiraResponse = await fetch(`${baseUrl}/rest/api/3/issue`, {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify(createPayload),
          });

          if (jiraResponse.ok) {
            const jiraData = await jiraResponse.json();
            console.log("Created JPD ticket:", jiraData.key);
            
            // Update intake with JPD key
            await supabase
              .from("intakes")
              .update({ jpd_issue_key: jiraData.key })
              .eq("id", intakeId);
            
            // Save to jira_exports
            await supabase
              .from("jira_exports")
              .upsert({
                intake_id: intakeId,
                jpd_issue_key: jiraData.key,
                status: 'success',
                logs: [`✓ Created JPD Idea: ${jiraData.key}`],
              }, { onConflict: 'intake_id' });
            
            jiraResult = { jpdIssueKey: jiraData.key, jiraBaseUrl: baseUrl, action: 'created' };
          } else {
            const errorText = await jiraResponse.text();
            console.error("Jira API error:", jiraResponse.status, errorText);
          }
        }
      } else {
        console.log("Jira credentials not configured, skipping");
      }
    } catch (jiraError) {
      console.error("Failed to create/update Jira ticket:", jiraError);
      // Don't throw - spec was saved successfully
    }

    return new Response(
      JSON.stringify({ success: true, spec: savedSpec, routing: savedRouting, jira: jiraResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-spec:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateMarkdown(spec: any): string {
  let md = `# Software Specification\n\n`;
  md += `## Problem Statement\n${spec.problemStatement}\n\n`;
  md += `## Current Process\n${spec.currentProcess}\n\n`;
  
  if (spec.painPoints?.length) {
    md += `## Pain Points\n${spec.painPoints.map((p: string) => `- ${p}`).join("\n")}\n\n`;
  }
  
  if (spec.goals?.length) {
    md += `## Goals\n${spec.goals.map((g: string) => `- ${g}`).join("\n")}\n\n`;
  }
  
  if (spec.users?.length) {
    md += `## Users\n`;
    spec.users.forEach((u: any) => {
      md += `- **${u.persona}**: ${u.count} users (${u.techLevel})\n`;
    });
    md += `\n`;
  }
  
  md += `## Data\n`;
  md += `- **Classification**: ${spec.dataClassification}\n`;
  if (spec.retentionPeriod) md += `- **Retention**: ${spec.retentionPeriod}\n`;
  if (spec.dataTypes?.length) md += `- **Data Types**: ${spec.dataTypes.join(", ")}\n`;
  md += `\n`;
  
  if (spec.integrations?.length) {
    md += `## Integrations\n`;
    spec.integrations.forEach((i: any) => {
      md += `- **${i.system}**: ${i.type} (${i.priority})\n`;
    });
    md += `\n`;
  }
  
  if (spec.acceptanceCriteria?.length) {
    md += `## Acceptance Criteria\n`;
    spec.acceptanceCriteria.forEach((ac: any) => {
      md += `### ${ac.storyRef}\n`;
      md += `- **Given** ${ac.given}\n`;
      md += `- **When** ${ac.when}\n`;
      md += `- **Then** ${ac.then}\n\n`;
    });
  }
  
  if (spec.risks?.length) {
    md += `## Risks\n`;
    spec.risks.forEach((r: any) => {
      md += `### ${r.id}\n`;
      md += `${r.description}\n`;
      md += `- Probability: ${r.probability}, Impact: ${r.impact}\n`;
      md += `- Mitigation: ${r.mitigation}\n\n`;
    });
  }
  
  if (spec.openQuestions?.length) {
    md += `## Open Questions\n${spec.openQuestions.map((q: string) => `- ${q}`).join("\n")}\n`;
  }
  
  return md;
}
