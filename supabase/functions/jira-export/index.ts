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
    const baseUrl = JIRA_BASE_URL.replace(/\/$/, '');
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

    // Update database with export results
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: updateError } = await supabase
      .from('jira_exports')
      .upsert({
        intake_id: intakeId,
        epic_key: epicKey,
        jpd_issue_key: jpdIssueKey,
        jsm_request_key: jsmRequestKey,
        status: epicKey ? 'success' : 'failed',
        logs: logs,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'intake_id'
      });

    if (updateError) {
      console.error('Failed to update jira_exports:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: !!epicKey,
        epicKey,
        jpdIssueKey,
        jsmRequestKey,
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
