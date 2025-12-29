import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Shield, Settings } from 'lucide-react';
import { toast } from 'sonner';

export default function PoliciesPage() {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return (
      <AppLayout>
        <div className="p-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-warning" />
              <h2 className="text-xl font-bold mb-2">Access Restricted</h2>
              <p className="text-muted-foreground">
                Only Admins can manage policies.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const handleSave = () => {
    toast.success('Policies saved');
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Policy Management</h1>
          <p className="text-muted-foreground">
            Configure routing rules, guardrails, and approval workflows
          </p>
        </div>

        {/* Routing Thresholds */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Routing Thresholds
            </CardTitle>
            <CardDescription>Configure scoring thresholds for delivery path recommendations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>AI Disposable Max Score</Label>
                <Input type="number" defaultValue="35" />
                <p className="text-xs text-muted-foreground">Below this score, AI Disposable is recommended</p>
              </div>
              <div className="space-y-2">
                <Label>Product Grade Min Score</Label>
                <Input type="number" defaultValue="60" />
                <p className="text-xs text-muted-foreground">Above this score, Product Grade is recommended</p>
              </div>
              <div className="space-y-2">
                <Label>Critical Security Score</Label>
                <Input type="number" defaultValue="80" />
                <p className="text-xs text-muted-foreground">Security score above this triggers Critical path</p>
              </div>
              <div className="space-y-2">
                <Label>Critical Availability Score</Label>
                <Input type="number" defaultValue="85" />
                <p className="text-xs text-muted-foreground">Availability score above this triggers Critical path</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Policies */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Policies
            </CardTitle>
            <CardDescription>Data classification and security requirements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Require security review for Confidential data</p>
                <p className="text-sm text-muted-foreground">Mandatory security review before approval</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Require architect approval for Critical path</p>
                <p className="text-sm text-muted-foreground">Critical systems need explicit architect sign-off</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Block Restricted data in AI Disposable</p>
                <p className="text-sm text-muted-foreground">Prevent short-lived apps from handling restricted data</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Enforce kill date for AI Disposable</p>
                <p className="text-sm text-muted-foreground">Require expiration date for disposable apps</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Approval Workflow */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Approval Workflow</CardTitle>
            <CardDescription>Configure who needs to approve each delivery path</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="font-medium">Delivery Path</div>
              <div className="font-medium">Required Approvers</div>
              <div className="font-medium">Auto-approve if</div>
            </div>
            <Separator />
            <div className="grid grid-cols-3 gap-4 text-sm items-center">
              <div>Buy</div>
              <div>Architect</div>
              <div className="text-muted-foreground">Score &lt; 30</div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm items-center">
              <div>Configure</div>
              <div>Architect</div>
              <div className="text-muted-foreground">—</div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm items-center">
              <div>AI Disposable</div>
              <div>Architect</div>
              <div className="text-muted-foreground">Public data only</div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm items-center">
              <div>Product Grade</div>
              <div>Architect + Engineer Lead</div>
              <div className="text-muted-foreground">—</div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm items-center">
              <div>Critical</div>
              <div>Architect + Engineer Lead + Security</div>
              <div className="text-muted-foreground">Never</div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave}>Save Policies</Button>
        </div>
      </div>
    </AppLayout>
  );
}
