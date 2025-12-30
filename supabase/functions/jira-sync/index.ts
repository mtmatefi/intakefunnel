import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const JIRA_API_TOKEN = Deno.env.get('JIRA_API_TOKEN');
    const JIRA_BASE_URL = Deno.env.get('JIRA_BASE_URL');
    const JIRA_USER_EMAIL = Deno.env.get('JIRA_USER_EMAIL');

    if (!JIRA_API_TOKEN || !JIRA_BASE_URL || !JIRA_USER_EMAIL) {
      return new Response(
        JSON.stringify({ error: 'Jira integration not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const baseUrl = JIRA_BASE_URL.replace(/\/$/, '');
    const authHeader = 'Basic ' + btoa(`${JIRA_USER_EMAIL}:${JIRA_API_TOKEN}`);

    const { intakeId } = await req.json();

    // Get the intake and its Jira export info
    const { data: intake, error: intakeError } = await supabase
      .from('intakes')
      .select('id, title, jpd_issue_key')
      .eq('id', intakeId)
      .single();

    if (intakeError || !intake) {
      return new Response(
        JSON.stringify({ error: 'Intake not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: jiraExport } = await supabase
      .from('jira_exports')
      .select('*')
      .eq('intake_id', intakeId)
      .maybeSingle();

    const syncResult: any = {
      intakeId,
      jiraBaseUrl: baseUrl,
      jpdIssue: null,
      epicIssue: null,
      synced: false,
    };

    // Helper to fetch issue from Jira
    const fetchJiraIssue = async (issueKey: string) => {
      const response = await fetch(`${baseUrl}/rest/api/3/issue/${issueKey}`, {
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json',
        },
      });
      if (response.ok) {
        return response.json();
      }
      return null;
    };

    // Sync JPD Issue
    const jpdKey = intake.jpd_issue_key || jiraExport?.jpd_issue_key;
    if (jpdKey) {
      const issue = await fetchJiraIssue(jpdKey);
      if (issue) {
        syncResult.jpdIssue = {
          key: issue.key,
          summary: issue.fields.summary,
          status: issue.fields.status?.name,
          priority: issue.fields.priority?.name,
          assignee: issue.fields.assignee?.displayName,
          updated: issue.fields.updated,
          labels: issue.fields.labels || [],
        };
        syncResult.synced = true;
      }
    }

    // Sync Epic Issue
    if (jiraExport?.epic_key) {
      const issue = await fetchJiraIssue(jiraExport.epic_key);
      if (issue) {
        syncResult.epicIssue = {
          key: issue.key,
          summary: issue.fields.summary,
          status: issue.fields.status?.name,
          priority: issue.fields.priority?.name,
          assignee: issue.fields.assignee?.displayName,
          updated: issue.fields.updated,
          labels: issue.fields.labels || [],
        };
        syncResult.synced = true;
      }
    }

    console.log(`Jira sync completed for intake ${intakeId}:`, syncResult.synced);

    return new Response(
      JSON.stringify(syncResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Jira sync error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
