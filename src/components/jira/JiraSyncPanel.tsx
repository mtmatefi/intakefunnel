import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, RefreshCw, Loader2, AlertCircle } from "lucide-react";

interface JiraSyncPanelProps {
  intakeId: string;
  jpdIssueKey?: string | null;
  autoRefreshInterval?: number; // in ms, default 30000 (30s)
}

interface JiraIssue {
  key: string;
  summary: string;
  status: string;
  priority?: string;
  assignee?: string;
  updated: string;
  labels: string[];
}

interface SyncResult {
  jiraBaseUrl: string;
  jpdIssue: JiraIssue | null;
  epicIssue: JiraIssue | null;
  synced: boolean;
  error?: string;
}

export function JiraSyncPanel({ intakeId, jpdIssueKey, autoRefreshInterval = 30000 }: JiraSyncPanelProps) {
  const [syncing, setSyncing] = useState(false);
  const [syncData, setSyncData] = useState<SyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  
  const { data: jiraExport } = useQuery({
    queryKey: ["jira-export", intakeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jira_exports")
        .select("*")
        .eq("intake_id", intakeId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const handleSync = useCallback(async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      const response = await supabase.functions.invoke("jira-sync", {
        body: { intakeId },
      });
      
      if (response.error) {
        setSyncError(response.error.message || "Sync failed");
        return;
      }
      
      if (response.data?.error) {
        setSyncError(response.data.error);
        return;
      }
      
      if (response.data) {
        setSyncData(response.data);
        setLastSynced(new Date());
        
        // Store jiraBaseUrl for other components
        if (response.data.jiraBaseUrl) {
          localStorage.setItem("jira_base_url", response.data.jiraBaseUrl);
        }
      }
    } catch (error) {
      console.error("Jira sync failed:", error);
      setSyncError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setSyncing(false);
    }
  }, [intakeId]);

  // Initial sync and auto-refresh every 30s
  useEffect(() => {
    const hasJiraLink = jpdIssueKey || jiraExport?.epic_key || jiraExport?.jpd_issue_key;
    if (!hasJiraLink) return;

    // Initial sync
    handleSync();

    // Auto-refresh interval
    const interval = setInterval(handleSync, autoRefreshInterval);
    return () => clearInterval(interval);
  }, [intakeId, jpdIssueKey, jiraExport?.epic_key, jiraExport?.jpd_issue_key, handleSync, autoRefreshInterval]);

  const jiraBaseUrl = syncData?.jiraBaseUrl || localStorage.getItem("jira_base_url") || "https://prodive.atlassian.net";

  const renderIssueCard = (issue: JiraIssue, label: string) => (
    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
      <div className="space-y-1 min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{label}</Badge>
          <a
            href={`${jiraBaseUrl}/browse/${issue.key}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-sm font-medium hover:underline flex items-center gap-1"
          >
            {issue.key}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-1">{issue.summary}</p>
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <Badge variant={issue.status === "Done" ? "default" : "secondary"}>
            {issue.status}
          </Badge>
          {issue.priority && (
            <span className="text-muted-foreground">Priority: {issue.priority}</span>
          )}
          {issue.assignee && (
            <span className="text-muted-foreground">→ {issue.assignee}</span>
          )}
        </div>
      </div>
    </div>
  );

  // No Jira link at all
  if (!jpdIssueKey && !jiraExport?.epic_key && !jiraExport?.jpd_issue_key) {
    return null;
  }

  const displayJpdKey = jpdIssueKey || jiraExport?.jpd_issue_key;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            Jira Status
            {lastSynced && (
              <span className="text-xs font-normal text-muted-foreground">
                (aktualisiert {lastSynced.toLocaleTimeString()})
              </span>
            )}
          </span>
          <Button variant="ghost" size="sm" onClick={handleSync} disabled={syncing}>
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Error display */}
        {syncError && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-destructive">Jira-Synchronisation fehlgeschlagen</p>
              <p className="text-muted-foreground mt-1">{syncError}</p>
            </div>
          </div>
        )}

        {/* Synced data */}
        {syncData?.jpdIssue && renderIssueCard(syncData.jpdIssue, "JPD Idea")}
        {syncData?.epicIssue && renderIssueCard(syncData.epicIssue, "Epic")}

        {/* Fallback links if no sync data yet */}
        {!syncData?.synced && !syncError && (
          <>
            {displayJpdKey && (
              <a
                href={`${jiraBaseUrl}/browse/${displayJpdKey}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm hover:underline p-2 rounded bg-muted"
              >
                <Badge>JPD</Badge>
                <span className="font-mono">{displayJpdKey}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {jiraExport?.epic_key && (
              <a
                href={`${jiraBaseUrl}/browse/${jiraExport.epic_key}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm hover:underline p-2 rounded bg-muted"
              >
                <Badge>Epic</Badge>
                <span className="font-mono">{jiraExport.epic_key}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
