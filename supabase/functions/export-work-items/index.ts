import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Exports innovation work items (epics/features/stories) to Jira,
 * then sends the Jira keys back to Strategy Sculptor.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const JIRA_API_TOKEN = Deno.env.get("JIRA_API_TOKEN");
    const JIRA_BASE_URL = Deno.env.get("JIRA_BASE_URL");
    const JIRA_USER_EMAIL = Deno.env.get("JIRA_USER_EMAIL");

    if (!JIRA_API_TOKEN || !JIRA_BASE_URL || !JIRA_USER_EMAIL) {
      return new Response(JSON.stringify({ error: "Jira integration not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawBaseUrl = JIRA_BASE_URL.trim().replace(/\/$/, "");
    const baseUrl = /^https?:\/\//i.test(rawBaseUrl) ? rawBaseUrl : `https://${rawBaseUrl}`;
    const jiraAuth = "Basic " + btoa(`${JIRA_USER_EMAIL}:${JIRA_API_TOKEN}`);

    const body = await req.json();
    const { innovation_id, project_key } = body;

    if (!innovation_id || !project_key) {
      return new Response(JSON.stringify({ error: "innovation_id and project_key required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const db = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the innovation
    const { data: innovation, error: innErr } = await db
      .from("synced_innovations")
      .select("*")
      .eq("id", innovation_id)
      .single();
    if (innErr || !innovation) {
      return new Response(JSON.stringify({ error: "Innovation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all work items for this innovation
    const { data: workItems, error: wiErr } = await db
      .from("innovation_work_items")
      .select("*")
      .eq("innovation_id", innovation_id)
      .order("item_type", { ascending: true }); // epics first, then features, then stories
    if (wiErr) throw wiErr;

    if (!workItems || workItems.length === 0) {
      return new Response(JSON.stringify({ error: "No work items to export" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const logs: string[] = [];

    // Jira API helper
    const jiraFetch = async (endpoint: string, options: RequestInit = {}) => {
      const url = `${baseUrl}/rest/api/3${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: jiraAuth,
          "Content-Type": "application/json",
          Accept: "application/json",
          ...options.headers,
        },
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Jira API ${response.status}: ${errorText}`);
      }
      return response.json();
    };

    // Map: work_item id → Jira issue key
    const jiraKeyMap: Record<string, { key: string; url: string }> = {};

    // Jira issue type mapping
    const typeMap: Record<string, string> = {
      epic: "Epic",
      feature: "Story", // Jira doesn't have "Feature" by default, map to Story
      story: "Story",
    };

    // Sort: epics first, then features, then stories (for parent references)
    const sorted = [...workItems].sort((a, b) => {
      const order = { epic: 0, feature: 1, story: 2 };
      return (order[a.item_type as keyof typeof order] ?? 1) - (order[b.item_type as keyof typeof order] ?? 1);
    });

    for (const wi of sorted) {
      if (wi.jira_issue_key) {
        // Already exported, skip but record the key
        jiraKeyMap[wi.id] = { key: wi.jira_issue_key, url: wi.jira_issue_url || `${baseUrl}/browse/${wi.jira_issue_key}` };
        logs.push(`⏭ ${wi.item_type} "${wi.title}" already exported: ${wi.jira_issue_key}`);
        continue;
      }

      try {
        logs.push(`Creating ${wi.item_type}: ${wi.title}...`);

        const fields: any = {
          project: { key: project_key },
          summary: wi.title,
          issuetype: { name: typeMap[wi.item_type] || "Story" },
          labels: ["ai-intake-router", "innovation-export", wi.item_type],
        };

        if (wi.description) {
          fields.description = {
            type: "doc",
            version: 1,
            content: [
              { type: "paragraph", content: [{ type: "text", text: wi.description }] },
            ],
          };
        }

        // Set parent if available
        if (wi.parent_id && jiraKeyMap[wi.parent_id]) {
          fields.parent = { key: jiraKeyMap[wi.parent_id].key };
        }

        const result = await jiraFetch("/issue", {
          method: "POST",
          body: JSON.stringify({ fields }),
        });

        const issueKey = result.key;
        const issueUrl = `${baseUrl}/browse/${issueKey}`;
        jiraKeyMap[wi.id] = { key: issueKey, url: issueUrl };
        logs.push(`✓ Created ${wi.item_type}: ${issueKey}`);

        // Update work item with Jira info
        await db.from("innovation_work_items").update({
          jira_issue_key: issueKey,
          jira_issue_url: issueUrl,
          jira_status: "To Do",
          jira_exported_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", wi.id);

      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logs.push(`✗ Failed ${wi.item_type} "${wi.title}": ${msg}`);
        console.error(`Jira export failed for ${wi.id}:`, msg);
      }
    }

    // ── Send Jira keys back to Sculptor ──
    const sculptorUrl = Deno.env.get("SCULPTOR_SUPABASE_URL");
    const syncSecret = Deno.env.get("CROSS_PROJECT_SYNC_SECRET");
    let sculptorSynced = false;

    if (sculptorUrl && syncSecret) {
      try {
        const jiraMapping = workItems
          .filter((wi) => jiraKeyMap[wi.id])
          .map((wi) => ({
            work_item_external_id: wi.external_id,
            jira_issue_key: jiraKeyMap[wi.id].key,
            jira_issue_url: jiraKeyMap[wi.id].url,
            jira_status: "To Do",
            item_type: wi.item_type,
            title: wi.title,
          }));

        const callbackPayload = {
          event: "jira_export_complete",
          innovation_external_id: innovation.external_id,
          innovation_title: innovation.title,
          jira_project_key: project_key,
          jira_base_url: baseUrl,
          work_items: jiraMapping,
        };

        const resp = await fetch(`${sculptorUrl}/functions/v1/receive-feedback`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-sync-secret": syncSecret,
          },
          body: JSON.stringify(callbackPayload),
        });

        sculptorSynced = resp.ok;
        logs.push(sculptorSynced
          ? "✓ Jira keys synced to Strategy Sculptor"
          : `⚠ Sculptor callback failed: ${resp.status}`
        );
      } catch (err) {
        logs.push(`⚠ Sculptor callback error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      exported_count: Object.keys(jiraKeyMap).length,
      total_items: workItems.length,
      sculptor_synced: sculptorSynced,
      logs,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("export-work-items error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
