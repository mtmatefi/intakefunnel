import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, RefreshCw, Loader2 } from "lucide-react";

interface JiraSyncPanelProps {
  intakeId: string;
  jpdIssueKey?: string | null;
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
}

export function JiraSyncPanel({ intakeId, jpdIssueKey }: JiraSyncPanelProps) {
  const [syncing, setSyncing] = useState(false);
  const [syncData, setSyncData] = useState<SyncResult | null>(null);
  
  // Auto-sync on mount and every 30 seconds
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

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await supabase.functions.invoke("jira-sync", {
        body: { intakeId },
      });
      
      if (response.data) {
        setSyncData(response.data);
      }
    } catch (error) {
      console.error("Jira sync failed:", error);
    } finally {
      setSyncing(false);
    }
  };

  // Initial sync
  useEffect(() => {
    if (jpdIssueKey || jiraExport?.epic_key) {
      handleSync();
    }
  }, [intakeId, jpdIssueKey, jiraExport?.epic_key]);

  const jiraBaseUrl = syncData?.jiraBaseUrl || localStorage.getItem("jiraBaseUrl") || "https://prodive.atlassian.net";

  const renderIssueCard = (issue: JiraIssue, label: string) => (
    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
      <div className="space-y-1">
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
        <div className="flex items-center gap-2 text-xs">
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

  // Display simple links if no sync data yet
  if (!syncData && (jpdIssueKey || jiraExport?.epic_key || jiraExport?.jpd_issue_key)) {
    const displayJpdKey = jpdIssueKey || jiraExport?.jpd_issue_key;
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            Jira Integration
            <Button variant="ghost" size="sm" onClick={handleSync} disabled={syncing}>
              {syncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {displayJpdKey && (
            <a
              href={`${jiraBaseUrl}/browse/${displayJpdKey}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm hover:underline"
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
              className="flex items-center gap-2 text-sm hover:underline"
            >
              <Badge>Epic</Badge>
              <span className="font-mono">{jiraExport.epic_key}</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!syncData?.synced) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          Jira Status (Live)
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
        {syncData.jpdIssue && renderIssueCard(syncData.jpdIssue, "JPD Idea")}
        {syncData.epicIssue && renderIssueCard(syncData.epicIssue, "Epic")}
      </CardContent>
    </Card>
  );
}
