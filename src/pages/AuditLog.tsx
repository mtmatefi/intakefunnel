import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { AlertTriangle, FileText, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const actionColors: Record<string, string> = {
  CREATE: 'bg-success/20 text-success',
  UPDATE: 'bg-info/20 text-info',
  DELETE: 'bg-destructive/20 text-destructive',
  VIEW: 'bg-muted text-muted-foreground',
  GENERATE: 'bg-warning/20 text-warning',
  REQUEST_APPROVAL: 'bg-primary/20 text-primary',
  APPROVE: 'bg-success/20 text-success',
  REJECT: 'bg-destructive/20 text-destructive',
  REQUEST_REVISION: 'bg-warning/20 text-warning',
  EXPORT: 'bg-info/20 text-info',
};

const actionLabels: Record<string, string> = {
  CREATE: 'Erstellt',
  UPDATE: 'Aktualisiert',
  GENERATE: 'Generiert',
  REQUEST_APPROVAL: 'Zur Prüfung',
  APPROVE: 'Genehmigt',
  REJECT: 'Abgelehnt',
  REQUEST_REVISION: 'Überarbeitung',
  EXPORT: 'Exportiert',
  VIEW: 'Angesehen',
};

export default function AuditLogPage() {
  const { user } = useAuth();
  const { data: logs = [], isLoading } = useAuditLogs(200);

  if (user?.role !== 'admin') {
    return (
      <AppLayout>
        <div className="p-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-warning" />
              <h2 className="text-xl font-bold mb-2">Zugriff beschränkt</h2>
              <p className="text-muted-foreground">Nur Administratoren haben Zugriff auf das Audit-Log.</p>
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
          <h1 className="text-2xl font-bold text-foreground">Audit-Log</h1>
          <p className="text-muted-foreground">Vollständige Historie aller Aktionen im System</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Letzte Aktivitäten
            </CardTitle>
            <CardDescription>{logs.length} Einträge</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : logs.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Noch keine Einträge vorhanden</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zeitpunkt</TableHead>
                    <TableHead>Akteur</TableHead>
                    <TableHead>Aktion</TableHead>
                    <TableHead>Entität</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('de-DE')}
                      </TableCell>
                      <TableCell className="font-medium">
                        {(log as any).profiles?.display_name || 'System'}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${actionColors[log.action] || 'bg-muted text-muted-foreground'}`}>
                          {actionLabels[log.action] || log.action}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{log.entity_type}</Badge>
                          {log.entity_id && log.entity_type === 'intake' && (
                            <Link 
                              to={`/intake/${log.entity_id}`}
                              className="text-xs text-primary hover:underline"
                            >
                              Öffnen
                            </Link>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {log.metadata_json ? Object.entries(log.metadata_json as Record<string, unknown>).map(([k, v]) => (
                          <span key={k} className="mr-2">{k}: {String(v)}</span>
                        )) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
