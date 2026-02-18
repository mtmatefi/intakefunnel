import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JiraExportRequest {
  intakeId: string;
  spec: {
    problemStatement: string;
    goals: string[];
    users: Array<{ persona: string; count: string }>;
    acceptanceCriteria: Array<{ storyRef: string; given: string; when: string; then: string }>;
    risks: Array<{ description: string; probability: string; impact: string }>;
    nfrs: Record<string, unknown>;
    outcomeHypotheses?: Array<{
      id: string;
      hypothesis: string;
      kpiName: string;
      baselineValue: string;
      targetValue: string;
      unit: string;
      timeframeWeeks: number;
      measurementMethod: string;
      dataSource: string;
      scope: string;
    }>;
    measurementPlan?: {
      dashboardRequired: boolean;
      apiEndpoints: Array<{ path: string; method: string; description: string }>;
      builtinTracking: Array<{ eventName: string; description: string; linkedHypothesisId: string; aggregation: string }>;
      reviewCadence: string;
      firstReviewAfterWeeks: number;
      escalationThreshold: string;
    };
  };
  routing: {
    path: string;
    score: number;
    explanation: string;
  };
  projectKeys: {
    jpdProject?: string;
    softwareProject: string;
    jsmProject?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const JIRA_API_TOKEN = Deno.env.get('JIRA_API_TOKEN');
    const JIRA_BASE_URL = Deno.env.get('JIRA_BASE_URL');
    const JIRA_USER_EMAIL = Deno.env.get('JIRA_USER_EMAIL');

    if (!JIRA_API_TOKEN || !JIRA_BASE_URL || !JIRA_USER_EMAIL) {
      console.error('Missing Jira credentials');
      return new Response(
        JSON.stringify({ error: 'Jira integration not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ensure base URL has correct format
    const rawBaseUrl = JIRA_BASE_URL.trim().replace(/\/$/, '');
    const baseUrl = /^https?:\/\//i.test(rawBaseUrl) ? rawBaseUrl : `https://${rawBaseUrl}`;
    const authHeader = 'Basic ' + btoa(`${JIRA_USER_EMAIL}:${JIRA_API_TOKEN}`);

    const { intakeId, spec, routing, projectKeys }: JiraExportRequest = await req.json();

    console.log(`Starting Jira export for intake ${intakeId}`);
    console.log(`Target project: ${projectKeys.softwareProject}`);

    const logs: string[] = [];
    let epicKey: string | null = null;
    let jpdIssueKey: string | null = null;
    let jsmRequestKey: string | null = null;

    // Helper function to make Jira API calls
    const jiraFetch = async (endpoint: string, options: RequestInit = {}) => {
      const url = `${baseUrl}/rest/api/3${endpoint}`;
      console.log(`Jira API call: ${options.method || 'GET'} ${url}`);
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Jira API error: ${response.status} - ${errorText}`);
        throw new Error(`Jira API error: ${response.status} - ${errorText}`);
      }

      return response.json();
    };

    // Step 1: Create Epic
    try {
      logs.push(`Creating Epic in project ${projectKeys.softwareProject}...`);
      
      const epicPayload = {
        fields: {
          project: { key: projectKeys.softwareProject },
          summary: `[${routing.path}] ${spec.problemStatement.substring(0, 100)}`,
          description: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: `Problem Statement: ${spec.problemStatement}` }]
              },
              {
                type: 'paragraph',
                content: [{ type: 'text', text: `Delivery Path: ${routing.path} (Score: ${routing.score})` }]
              },
              {
                type: 'heading',
                attrs: { level: 2 },
                content: [{ type: 'text', text: 'Goals' }]
              },
              {
                type: 'bulletList',
                content: spec.goals.map(goal => ({
                  type: 'listItem',
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: goal }] }]
                }))
              },
              {
                type: 'heading',
                attrs: { level: 2 },
                content: [{ type: 'text', text: 'Users' }]
              },
              {
                type: 'bulletList',
                content: spec.users.map(u => ({
                  type: 'listItem',
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: `${u.persona}: ${u.count}` }] }]
                }))
              },
              {
                type: 'heading',
                attrs: { level: 2 },
                content: [{ type: 'text', text: 'Risks' }]
              },
              {
                type: 'bulletList',
                content: spec.risks.map(r => ({
                  type: 'listItem',
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: `${r.description} (P: ${r.probability}, I: ${r.impact})` }] }]
                }))
              }
            ]
          },
          issuetype: { name: 'Epic' },
          labels: ['ai-intake-router', routing.path.toLowerCase().replace('_', '-')],
        }
      };

      const epicResult = await jiraFetch('/issue', {
        method: 'POST',
        body: JSON.stringify(epicPayload),
      });

      epicKey = epicResult.key;
      logs.push(`✓ Created Epic: ${epicKey}`);
      console.log(`Created Epic: ${epicKey}`);

    } catch (error) {
      const errorMsg = `Failed to create Epic: ${error instanceof Error ? error.message : String(error)}`;
      logs.push(`✗ ${errorMsg}`);
      console.error(errorMsg);
    }

    // Step 2: Create Stories from acceptance criteria
    if (epicKey && spec.acceptanceCriteria.length > 0) {
      for (const ac of spec.acceptanceCriteria) {
        try {
          logs.push(`Creating Story: ${ac.storyRef}...`);

          const storyPayload = {
            fields: {
              project: { key: projectKeys.softwareProject },
              summary: `${ac.storyRef}: ${ac.when.substring(0, 80)}`,
              description: {
                type: 'doc',
                version: 1,
                content: [
                  {
                    type: 'heading',
                    attrs: { level: 2 },
                    content: [{ type: 'text', text: 'Acceptance Criteria' }]
                  },
                  {
                    type: 'paragraph',
                    content: [
                      { type: 'text', text: 'Given ', marks: [{ type: 'strong' }] },
                      { type: 'text', text: ac.given }
                    ]
                  },
                  {
                    type: 'paragraph',
                    content: [
                      { type: 'text', text: 'When ', marks: [{ type: 'strong' }] },
                      { type: 'text', text: ac.when }
                    ]
                  },
                  {
                    type: 'paragraph',
                    content: [
                      { type: 'text', text: 'Then ', marks: [{ type: 'strong' }] },
                      { type: 'text', text: ac.then }
                    ]
                  }
                ]
              },
              issuetype: { name: 'Story' },
              labels: ['ai-intake-router', ac.storyRef.toLowerCase()],
              parent: { key: epicKey },
            }
          };

          const storyResult = await jiraFetch('/issue', {
            method: 'POST',
            body: JSON.stringify(storyPayload),
          });

          logs.push(`✓ Created Story: ${storyResult.key}`);
          console.log(`Created Story: ${storyResult.key}`);

        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          logs.push(`✗ Failed to create story ${ac.storyRef}: ${errMsg}`);
          console.error(`Failed to create story: ${errMsg}`);
        }
      }
    }

    // Step 3: Create Outcome Measurement Stories
    if (epicKey && spec.outcomeHypotheses?.length) {
      // Create one story for outcome tracking infrastructure
      try {
        logs.push('Creating Outcome Measurement stories...');

        // Build tracking events list for the description
        const trackingEvents = spec.measurementPlan?.builtinTracking || [];
        const apiEndpoints = spec.measurementPlan?.apiEndpoints || [];

        const trackingContent = trackingEvents.map((t) => ({
          type: 'listItem' as const,
          content: [{ type: 'paragraph' as const, content: [
            { type: 'text' as const, text: `${t.eventName}`, marks: [{ type: 'code' as const }] },
            { type: 'text' as const, text: ` - ${t.description} (${t.aggregation})` },
          ] }]
        }));

        const apiContent = apiEndpoints.map((ep) => ({
          type: 'listItem' as const,
          content: [{ type: 'paragraph' as const, content: [
            { type: 'text' as const, text: `${ep.method} ${ep.path}`, marks: [{ type: 'code' as const }] },
            { type: 'text' as const, text: ` - ${ep.description}` },
          ] }]
        }));

        const measureStoryPayload = {
          fields: {
            project: { key: projectKeys.softwareProject },
            summary: `MEASURE: Implement outcome tracking & KPI endpoints`,
            description: {
              type: 'doc',
              version: 1,
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'This story ensures the application can prove its own effectiveness. Every built solution must be measurable.', marks: [{ type: 'strong' }] }]
                },
                {
                  type: 'heading',
                  attrs: { level: 2 },
                  content: [{ type: 'text', text: 'Tracking Events to Implement' }]
                },
                ...(trackingContent.length > 0 ? [{
                  type: 'bulletList' as const,
                  content: trackingContent,
                }] : [{
                  type: 'paragraph' as const,
                  content: [{ type: 'text' as const, text: 'No tracking events defined yet.' }],
                }]),
                {
                  type: 'heading',
                  attrs: { level: 2 },
                  content: [{ type: 'text', text: 'Outcome API Endpoints to Implement' }]
                },
                ...(apiContent.length > 0 ? [{
                  type: 'bulletList' as const,
                  content: apiContent,
                }] : [{
                  type: 'paragraph' as const,
                  content: [{ type: 'text' as const, text: 'No API endpoints defined yet.' }],
                }]),
                ...(spec.measurementPlan?.dashboardRequired ? [{
                  type: 'heading' as const,
                  attrs: { level: 2 },
                  content: [{ type: 'text' as const, text: 'Outcome Dashboard' }],
                }, {
                  type: 'paragraph' as const,
                  content: [{ type: 'text' as const, text: 'An outcome dashboard MUST be built into the application showing KPI progress vs. baseline and target values.' }],
                }] : []),
              ]
            },
            issuetype: { name: 'Story' },
            labels: ['ai-intake-router', 'outcome-measurement'],
            parent: { key: epicKey },
          }
        };

        const measureResult = await jiraFetch('/issue', {
          method: 'POST',
          body: JSON.stringify(measureStoryPayload),
        });

        logs.push(`✓ Created Measurement Story: ${measureResult.key}`);
        console.log(`Created Measurement Story: ${measureResult.key}`);

      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        logs.push(`✗ Failed to create measurement story: ${errMsg}`);
        console.error(`Failed to create measurement story: ${errMsg}`);
      }

      // Create individual hypothesis verification stories
      for (const hyp of spec.outcomeHypotheses) {
        try {
          const hypStoryPayload = {
            fields: {
              project: { key: projectKeys.softwareProject },
              summary: `VERIFY: ${hyp.kpiName} (${hyp.baselineValue}→${hyp.targetValue} ${hyp.unit})`,
              description: {
                type: 'doc',
                version: 1,
                content: [
                  {
                    type: 'heading',
                    attrs: { level: 2 },
                    content: [{ type: 'text', text: 'Hypothesis' }]
                  },
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: hyp.hypothesis }]
                  },
                  {
                    type: 'heading',
                    attrs: { level: 2 },
                    content: [{ type: 'text', text: 'Acceptance Criteria' }]
                  },
                  {
                    type: 'paragraph',
                    content: [
                      { type: 'text', text: 'Given ', marks: [{ type: 'strong' }] },
                      { type: 'text', text: `baseline ${hyp.kpiName} is ${hyp.baselineValue} ${hyp.unit}` },
                    ]
                  },
                  {
                    type: 'paragraph',
                    content: [
                      { type: 'text', text: 'When ', marks: [{ type: 'strong' }] },
                      { type: 'text', text: `the solution has been live for ${hyp.timeframeWeeks} weeks` },
                    ]
                  },
                  {
                    type: 'paragraph',
                    content: [
                      { type: 'text', text: 'Then ', marks: [{ type: 'strong' }] },
                      { type: 'text', text: `${hyp.kpiName} should be ${hyp.targetValue} ${hyp.unit} or better` },
                    ]
                  },
                  {
                    type: 'heading',
                    attrs: { level: 2 },
                    content: [{ type: 'text', text: 'Measurement Method' }]
                  },
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: hyp.measurementMethod }]
                  },
                  {
                    type: 'paragraph',
                    content: [
                      { type: 'text', text: `Data Source: ${hyp.dataSource} | Scope: ${hyp.scope}` },
                    ]
                  },
                ]
              },
              issuetype: { name: 'Story' },
              labels: ['ai-intake-router', 'outcome-verification', hyp.id],
              parent: { key: epicKey },
            }
          };

          const hypResult = await jiraFetch('/issue', {
            method: 'POST',
            body: JSON.stringify(hypStoryPayload),
          });

          logs.push(`✓ Created Verification Story: ${hypResult.key} (${hyp.kpiName})`);
          console.log(`Created Verification Story: ${hypResult.key}`);

        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          logs.push(`✗ Failed to create verification story for ${hyp.kpiName}: ${errMsg}`);
          console.error(`Failed to create verification story: ${errMsg}`);
        }
      }
    }

    // Update database with export results
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if export already exists
    const { data: existingExport } = await supabase
      .from('jira_exports')
      .select('id')
      .eq('intake_id', intakeId)
      .maybeSingle();

    if (existingExport) {
      // Update existing export
      const { error: updateError } = await supabase
        .from('jira_exports')
        .update({
          epic_key: epicKey,
          jpd_issue_key: jpdIssueKey,
          jsm_request_key: jsmRequestKey,
          status: epicKey ? 'success' : 'failed',
          logs: logs,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingExport.id);

      if (updateError) {
        console.error('Failed to update jira_exports:', updateError);
      }
    } else {
      // Insert new export
      const { error: insertError } = await supabase
        .from('jira_exports')
        .insert({
          intake_id: intakeId,
          epic_key: epicKey,
          jpd_issue_key: jpdIssueKey,
          jsm_request_key: jsmRequestKey,
          status: epicKey ? 'success' : 'failed',
          logs: logs,
        });

      if (insertError) {
        console.error('Failed to insert jira_exports:', insertError);
      }
    }

    return new Response(
      JSON.stringify({
        success: !!epicKey,
        epicKey,
        jpdIssueKey,
        jsmRequestKey,
        jiraBaseUrl: baseUrl,
        logs,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Jira export error:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errMsg, logs: [`Fatal error: ${errMsg}`] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
