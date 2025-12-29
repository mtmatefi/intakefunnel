import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
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
import { AlertTriangle, FileText } from 'lucide-react';

// Demo audit logs
const demoAuditLogs = [
  {
    id: '1',
    actorName: 'Frau Maria Meier',
    action: 'CREATE',
    entityType: 'intake',
    entityId: 'intake-1',
    createdAt: '2024-01-15T09:30:00Z',
    metadata: { title: 'Warehouse Item Tracking via Barcode/QR' },
  },
  {
    id: '2',
    actorName: 'Frau Maria Meier',
    action: 'UPDATE',
    entityType: 'intake',
    entityId: 'intake-1',
    createdAt: '2024-01-15T14:22:00Z',
    metadata: { status: 'spec_generated' },
  },
  {
    id: '3',
    actorName: 'System',
    action: 'GENERATE',
    entityType: 'spec_document',
    entityId: 'spec-1',
    createdAt: '2024-01-15T14:20:00Z',
    metadata: { intakeId: 'intake-1', version: 1 },
  },
  {
    id: '4',
    actorName: 'Thomas Weber',
    action: 'VIEW',
    entityType: 'intake',
    entityId: 'intake-1',
    createdAt: '2024-01-15T15:00:00Z',
    metadata: {},
  },
  {
    id: '5',
    actorName: 'Frau Maria Meier',
    action: 'REQUEST_APPROVAL',
    entityType: 'intake',
    entityId: 'intake-1',
    createdAt: '2024-01-15T15:30:00Z',
    metadata: { targetRole: 'architect' },
  },
];

const actionColors: Record<string, string> = {
  CREATE: 'bg-success/20 text-success',
  UPDATE: 'bg-info/20 text-info',
  DELETE: 'bg-destructive/20 text-destructive',
  VIEW: 'bg-muted text-muted-foreground',
  GENERATE: 'bg-warning/20 text-warning',
  REQUEST_APPROVAL: 'bg-primary/20 text-primary',
  APPROVE: 'bg-success/20 text-success',
  REJECT: 'bg-destructive/20 text-destructive',
  EXPORT: 'bg-info/20 text-info',
};

export default function AuditLogPage() {
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
                Only Admins can access the audit log.
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
          <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
          <p className="text-muted-foreground">
            Complete history of all actions in the system
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>All create, update, and approval actions are logged</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demoAuditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium">{log.actorName}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs font-medium ${actionColors[log.action] || ''}`}>
                        {log.action}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.entityType}</Badge>
                      <span className="text-xs text-muted-foreground ml-2">{log.entityId}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {Object.entries(log.metadata).map(([k, v]) => (
                        <span key={k} className="mr-2">
                          {k}: {String(v)}
                        </span>
                      ))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
