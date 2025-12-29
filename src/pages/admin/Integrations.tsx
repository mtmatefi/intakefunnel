import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Plug, ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function IntegrationsPage() {
  const { user } = useAuth();
  const [jiraConnected, setJiraConnected] = useState(false);
  const [xrayEnabled, setXrayEnabled] = useState(false);

  if (user?.role !== 'admin') {
    return (
      <AppLayout>
        <div className="p-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-warning" />
              <h2 className="text-xl font-bold mb-2">Access Restricted</h2>
              <p className="text-muted-foreground">
                Only Admins can manage integrations.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const handleTestConnection = () => {
    toast.success('Connection successful!', {
      description: 'Jira Cloud API is reachable.',
    });
    setJiraConnected(true);
  };

  const handleSave = () => {
    toast.success('Integration settings saved');
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Integration Settings</h1>
          <p className="text-muted-foreground">
            Configure Jira Cloud and other external integrations
          </p>
        </div>

        {/* Jira Cloud */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plug className="h-5 w-5" />
                <CardTitle className="text-base">Jira Cloud</CardTitle>
              </div>
              <Badge variant={jiraConnected ? 'default' : 'outline'} className="gap-1">
                {jiraConnected ? (
                  <>
                    <CheckCircle className="h-3 w-3" />
                    Connected
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3" />
                    Not Connected
                  </>
                )}
              </Badge>
            </div>
            <CardDescription>
              Connect to Jira Software, Jira Product Discovery, and Jira Service Management
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Jira Base URL</Label>
              <Input placeholder="https://your-org.atlassian.net" />
              <p className="text-xs text-muted-foreground">Your Atlassian Cloud instance URL</p>
            </div>
            
            <div className="space-y-2">
              <Label>API Token</Label>
              <Input type="password" placeholder="••••••••••••••••" />
              <p className="text-xs text-muted-foreground">
                Generate an API token at{' '}
                <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener" className="text-primary hover:underline">
                  Atlassian Account Settings
                </a>
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="your-email@company.com" />
              <p className="text-xs text-muted-foreground">Email associated with the API token</p>
            </div>

            <Button variant="outline" onClick={handleTestConnection}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Test Connection
            </Button>
          </CardContent>
        </Card>

        {/* Project Mapping */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project Mapping</CardTitle>
            <CardDescription>Map delivery paths to Jira projects</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Jira Product Discovery Project</Label>
                <Input placeholder="JPD" />
              </div>
              <div className="space-y-2">
                <Label>Jira Software Project (Epics/Stories)</Label>
                <Input placeholder="DEV" />
              </div>
              <div className="space-y-2">
                <Label>Jira Service Management Project</Label>
                <Input placeholder="ITSM" />
              </div>
              <div className="space-y-2">
                <Label>Default Epic Issue Type ID</Label>
                <Input placeholder="10000" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Xray Integration */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Xray Test Management</CardTitle>
              <Switch checked={xrayEnabled} onCheckedChange={setXrayEnabled} />
            </div>
            <CardDescription>
              Create test placeholders in Xray when exporting to Jira
            </CardDescription>
          </CardHeader>
          {xrayEnabled && (
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Xray Client ID</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label>Xray Client Secret</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
            </CardContent>
          )}
        </Card>

        {/* AI Provider */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI Provider</CardTitle>
            <CardDescription>Configure the AI provider for spec generation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <div className="flex gap-2">
                <Button variant="default" size="sm">Lovable AI</Button>
                <Button variant="outline" size="sm">OpenAI</Button>
                <Button variant="outline" size="sm">Anthropic</Button>
                <Button variant="outline" size="sm">Azure OpenAI</Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Lovable AI is pre-configured and requires no API key
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave}>Save Settings</Button>
        </div>
      </div>
    </AppLayout>
  );
}
