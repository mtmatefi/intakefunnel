import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { innovationId } = await req.json();
    if (!innovationId) {
      return new Response(JSON.stringify({ error: "innovationId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── 1. Innovation ──
    const { data: innovation, error: innErr } = await db
      .from("synced_innovations")
      .select("*")
      .eq("id", innovationId)
      .single();
    if (innErr || !innovation) throw new Error("Innovation not found");

    // ── 2. Initiative link → Intake ──
    const { data: link } = await db
      .from("initiative_intake_links")
      .select("*")
      .eq("initiative_id", innovation.external_id)
      .maybeSingle();

    let intake: any = null;
    let spec: any = null;
    let approval: any = null;
    let impactScore: any = null;
    let routingScores: any[] = [];
    let guidelines: any[] = [];
    let followups: any[] = [];

    if (link?.intake_id) {
      // Fetch all related data in parallel
      const [intakeRes, specRes, approvalRes, impactRes, routingRes, guidelinesRes, followupRes] = await Promise.all([
        db.from("intakes").select("*").eq("id", link.intake_id).single(),
        db.from("spec_documents").select("*").eq("intake_id", link.intake_id).order("version", { ascending: false }).limit(1).single(),
        db.from("approvals").select("*").eq("intake_id", link.intake_id).order("decided_at", { ascending: false }).limit(1).maybeSingle(),
        db.from("impact_scores").select("*").eq("intake_id", link.intake_id).maybeSingle(),
        db.from("routing_scores").select("*").eq("intake_id", link.intake_id),
        db.from("guidelines").select("id, name, compliance_framework, severity, type").eq("is_active", true),
        db.from("followup_requests").select("*").eq("intake_id", link.intake_id),
      ]);

      intake = intakeRes.data;
      spec = specRes.data;
      approval = approvalRes.data;
      impactScore = impactRes.data;
      routingScores = routingRes.data || [];
      guidelines = guidelinesRes.data || [];
      followups = followupRes.data || [];
    }

    // ── 3. Work Items ──
    const { data: workItems } = await db
      .from("innovation_work_items")
      .select("*")
      .eq("innovation_id", innovationId)
      .order("item_type", { ascending: true });

    const items = workItems || [];

    // Build tree for nested payload
    const itemMap: Record<string, any> = {};
    for (const wi of items) {
      itemMap[wi.id] = { ...wi, _children: [] };
    }
    for (const wi of items) {
      if (wi.parent_id && itemMap[wi.parent_id]) {
        itemMap[wi.parent_id]._children.push(itemMap[wi.id]);
      }
    }
    const epics = items.filter((wi: any) => wi.item_type === "epic");
    const totalSP = items.reduce((sum: number, wi: any) => sum + (wi.story_points || 0), 0);

    // Build nested structure
    function buildItemPayload(wi: any): any {
      const node = itemMap[wi.id];
      const result: any = {
        external_id: wi.external_id,
        type: wi.item_type,
        title: wi.title,
        description: wi.description,
        priority: wi.priority,
        status: wi.status,
        story_points: wi.story_points,
        acceptance_criteria: wi.acceptance_criteria || [],
        functional_requirements: wi.functional_requirements || [],
        non_functional_requirements: wi.non_functional_requirements || [],
        definition_of_done: wi.definition_of_done,
        jira_issue_key: wi.jira_issue_key,
        jira_issue_url: wi.jira_issue_url,
        parent_external_id: wi.parent_id ? itemMap[wi.parent_id]?.external_id || null : null,
      };
      if (node._children.length > 0) {
        const childKey = wi.item_type === "epic" ? "features" : "stories";
        result[childKey] = node._children.map((c: any) => buildItemPayload(c));
        result.total_story_points = node._children.reduce(
          (sum: number, c: any) => sum + (c.story_points || 0) + (c._children || []).reduce((s: number, gc: any) => s + (gc.story_points || 0), 0),
          0,
        );
        result.children_count = node._children.length;
      }
      return result;
    }

    // ── 4. Routing ──
    const bestRoute = routingScores.sort((a: any, b: any) => b.score - a.score)[0];

    // ── 5. Structured spec ──
    const structuredSpec = spec?.structured_json as any || {};

    // ── 6. Assemble payload ──
    const payload: any = {
      event: "delivery_package_ready",
      source: "intake_funnel",
      timestamp: new Date().toISOString(),
      innovation_external_id: innovation.external_id,

      // Intake context
      intake: intake
        ? {
            id: intake.id,
            title: intake.title,
            category: intake.category,
            value_stream: intake.value_stream,
            priority: intake.priority,
            status: intake.status,
          }
        : null,

      // WSJF / Impact
      impact_assessment: impactScore
        ? {
            business_value: impactScore.business_value,
            time_criticality: impactScore.time_criticality,
            risk_reduction: impactScore.risk_reduction,
            strategic_fit: impactScore.strategic_fit,
            effort_estimate: impactScore.effort_estimate,
            wsjf_score: impactScore.wsjf_score,
            notes: impactScore.notes,
            scored_at: impactScore.updated_at,
          }
        : null,

      // Routing
      routing: bestRoute
        ? {
            recommended_path: bestRoute.path,
            confidence_score: bestRoute.score,
            alternatives: routingScores
              .filter((r: any) => r.id !== bestRoute.id)
              .map((r: any) => ({ path: r.path, score: r.score })),
            explanation: bestRoute.explanation_markdown,
          }
        : null,

      // Compliance & risks
      compliance: {
        data_classification: structuredSpec.dataClassification || null,
        applicable_guidelines: guidelines.map((g: any) => ({
          id: g.id,
          name: g.name,
          framework: g.compliance_framework,
          severity: g.severity,
        })),
        identified_risks: (structuredSpec.risks || []).map((r: any) => ({
          category: r.category || "general",
          severity: r.severity || "medium",
          description: r.description,
          mitigation: r.mitigation || null,
        })),
      },

      // Spec summary
      spec_summary: spec
        ? {
            spec_id: spec.id,
            version: spec.version,
            problem_statement: structuredSpec.problemStatement,
            goals: structuredSpec.goals || [],
            target_users: (structuredSpec.users || []).map((u: any) => ({
              persona: u.persona,
              count: u.count,
            })),
            integrations: (structuredSpec.integrations || []).map((i: any) => ({
              system: i.system,
              type: i.type || "read",
              complexity: i.complexity || "medium",
            })),
            nfrs: structuredSpec.nfrs || null,
          }
        : null,

      // Approval
      approval: approval
        ? {
            decision: approval.decision,
            decided_at: approval.decided_at,
            guardrails: approval.guardrails_json || [],
            comments: approval.comments,
          }
        : null,

      // Work items
      work_items: {
        total_story_points: totalSP,
        summary: {
          epics: items.filter((w: any) => w.item_type === "epic").length,
          features: items.filter((w: any) => w.item_type === "feature").length,
          stories: items.filter((w: any) => w.item_type === "story").length,
        },
        items: epics.map((e: any) => buildItemPayload(e)),
      },

      // Value drivers from innovation data
      value_drivers: {
        strategic_alignment: {
          initiatives: innovation.linked_initiative_ids || [],
          hypothesis: innovation.hypothesis,
          expected_outcome: innovation.expected_outcome,
          value_proposition: innovation.value_proposition,
        },
        effort: {
          estimate: innovation.effort_estimate,
          total_story_points: totalSP,
        },
        impact_data: innovation.impact_data || [],
        risk_data: innovation.risk_data || [],
        trend_data: innovation.trend_data || [],
      },

      // Followup context
      followup_count: followups.length,
      all_questions_answered: followups.every((f: any) => f.status === "answered"),
    };

    // ── 7. Send to Sculptor ──
    const sculptorUrl = Deno.env.get("SCULPTOR_SUPABASE_URL");
    const syncSecret = Deno.env.get("CROSS_PROJECT_SYNC_SECRET");

    if (!sculptorUrl || !syncSecret) {
      // Return payload without sending (for preview/debug)
      return new Response(JSON.stringify({
        success: true,
        sent: false,
        reason: "SCULPTOR_SUPABASE_URL or CROSS_PROJECT_SYNC_SECRET not configured",
        payload,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch(`${sculptorUrl}/functions/v1/receive-feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-sync-secret": syncSecret,
      },
      body: JSON.stringify(payload),
    });

    const sculptorResult = resp.ok ? await resp.json().catch(() => null) : null;

    // Log audit
    if (intake) {
      await db.from("audit_logs").insert({
        action: "delivery_package_published",
        actor_id: intake.requester_id,
        entity_type: "innovation",
        entity_id: innovationId,
        metadata_json: {
          sculptor_status: resp.status,
          work_items_count: items.length,
          total_story_points: totalSP,
        },
      }).then(() => {});
    }

    return new Response(JSON.stringify({
      success: resp.ok,
      sent: true,
      sculptor_status: resp.status,
      sculptor_response: sculptorResult,
      payload,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("publish-delivery-package error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
