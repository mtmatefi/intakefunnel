import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { demoIntakes, deliveryPathInfo, demoRoutingScore } from '@/data/demo';
import type { IntakeStatus } from '@/types/intake';
import { 
  CheckCircle,
  XCircle,
  Clock,
  Route,
  ArrowUpRight,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const statusConfig: Record<IntakeStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: 'Draft', variant: 'outline' },
  gathering_info: { label: 'Gathering Info', variant: 'secondary' },
  spec_generated: { label: 'Spec Ready', variant: 'secondary' },
  pending_approval: { label: 'Pending Approval', variant: 'default' },
  approved: { label: 'Approved', variant: 'default' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  exported: { label: 'Exported', variant: 'default' },
  closed: { label: 'Closed', variant: 'outline' },
};

export default function ArchitectQueuePage() {
  const { user } = useAuth();
  
  // Filter only pending approval intakes
  const pendingIntakes = demoIntakes.filter(i => i.status === 'pending_approval');
  const pathInfo = deliveryPathInfo[demoRoutingScore.path];

  const handleApprove = (intakeId: string) => {
    toast.success('Intake approved', {
      description: 'Guardrails will be applied and the intake is ready for export.',
    });
  };

  const handleReject = (intakeId: string) => {
    toast.error('Intake rejected', {
      description: 'The requester will be notified to revise their intake.',
    });
  };

  if (user?.role !== 'architect' && user?.role !== 'admin') {
    return (
      <AppLayout>
        <div className="p-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-warning" />
              <h2 className="text-xl font-bold mb-2">Access Restricted</h2>
              <p className="text-muted-foreground">
                Only Architects and Admins can access this page.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Architect Queue</h1>
          <p className="text-muted-foreground">
            Review and approve intake requests with routing recommendations
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-warning">{pendingIntakes.length}</div>
              <p className="text-xs text-muted-foreground">Pending Review</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-success">
                {demoIntakes.filter(i => i.status === 'approved').length}
              </div>
              <p className="text-xs text-muted-foreground">Approved Today</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {demoIntakes.filter(i => i.status === 'exported').length}
              </div>
              <p className="text-xs text-muted-foreground">Exported to Jira</p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Intakes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending Approvals</CardTitle>
            <CardDescription>Intakes awaiting your review and routing decision</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingIntakes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No pending approvals. All caught up!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingIntakes.map((intake) => (
                  <Card key={intake.id} className="border-2">
                    <CardContent className="p-4">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Link 
                              to={`/intake/${intake.id}`}
                              className="font-medium text-foreground hover:underline"
                            >
                              {intake.title}
                            </Link>
                            <Badge variant="outline">{intake.category}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            By {intake.requesterName} • {intake.valueStream} • {new Date(intake.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          {/* Routing Recommendation */}
                          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50">
                            <Route className="h-4 w-4" />
                            <div>
                              <p className="text-xs text-muted-foreground">Recommended</p>
                              <p className="font-medium text-sm">{pathInfo.label}</p>
                            </div>
                            <Badge className="ml-2">{demoRoutingScore.score}</Badge>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                            >
                              <Link to={`/intake/${intake.id}`}>
                                <ArrowUpRight className="h-4 w-4 mr-1" />
                                Review
                              </Link>
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleApprove(intake.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleReject(intake.id)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Guardrails Template */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Default Guardrails by Path</CardTitle>
            <CardDescription>Standard guardrails applied based on delivery path</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Path</TableHead>
                  <TableHead>Data Zone</TableHead>
                  <TableHead>Required Tests</TableHead>
                  <TableHead>Required Reviews</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-path-buy" />
                      Buy
                    </span>
                  </TableCell>
                  <TableCell>Green</TableCell>
                  <TableCell>Security</TableCell>
                  <TableCell>Vendor, Security</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-path-config" />
                      Configure
                    </span>
                  </TableCell>
                  <TableCell>Green/Yellow</TableCell>
                  <TableCell>Unit, Integration</TableCell>
                  <TableCell>Code, Architecture</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-path-ai-disposable" />
                      AI Disposable
                    </span>
                  </TableCell>
                  <TableCell>Green</TableCell>
                  <TableCell>E2E</TableCell>
                  <TableCell>Code</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-path-product" />
                      Product Grade
                    </span>
                  </TableCell>
                  <TableCell>Yellow</TableCell>
                  <TableCell>Unit, Integration, E2E, Performance</TableCell>
                  <TableCell>Code, Architecture, Security</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-path-critical" />
                      Critical
                    </span>
                  </TableCell>
                  <TableCell>Red</TableCell>
                  <TableCell>All + Security + Penetration</TableCell>
                  <TableCell>All + External Audit</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
