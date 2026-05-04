import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useAllIntakes } from '@/hooks/useIntakes';
import type { IntakeStatus } from '@/types/intake';
import {
  PlusCircle, Search, Filter, ArrowUpRight, Clock, CheckCircle, AlertCircle,
  FileText, Send, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const statusConfig: Record<IntakeStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: typeof Clock }> = {
  draft: { label: 'Entwurf', variant: 'outline', icon: FileText },
  gathering_info: { label: 'Interview', variant: 'secondary', icon: Clock },
  spec_generated: { label: 'Spec bereit', variant: 'secondary', icon: FileText },
  pending_approval: { label: 'Zur Prüfung', variant: 'default', icon: Clock },
  approved: { label: 'Genehmigt', variant: 'default', icon: CheckCircle },
  rejected: { label: 'Abgelehnt', variant: 'destructive', icon: AlertCircle },
  exported: { label: 'Exportiert', variant: 'default', icon: Send },
  closed: { label: 'Geschlossen', variant: 'outline', icon: CheckCircle },
};

const priorityColors = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-info/20 text-info',
  high: 'bg-warning/20 text-warning',
  critical: 'bg-destructive/20 text-destructive',
};

export default function IntakesPage() {
  const { user } = useAuth();
  const { data: intakes = [], isLoading } = useAllIntakes();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const isPrivileged = user?.role === 'admin' || user?.role === 'architect';
  const title = isPrivileged ? 'Alle Intakes' : 'Meine Intakes';
  const subtitle = isPrivileged
    ? 'Übersicht aller Intake-Anfragen über alle Workspaces hinweg'
    : 'Übersicht Ihrer eigenen Intake-Anfragen';

  const filtered = intakes.filter(intake => {
    const matchesSearch = intake.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (intake.jpd_issue_key || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || intake.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            <p className="text-muted-foreground">{subtitle}</p>
          </div>
          <Button asChild>
            <Link to="/intake/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Neuer Intake
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Suche nach Titel oder Jira-Key..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Status</SelectItem>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[240px]">Titel</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden sm:table-cell">Priorität</TableHead>
                      <TableHead className="hidden md:table-cell">Kategorie</TableHead>
                      <TableHead className="hidden md:table-cell">Aktualisiert</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Keine Intakes gefunden.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((intake) => {
                        const status = statusConfig[intake.status];
                        return (
                          <TableRow key={intake.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {intake.jpd_issue_key && (
                                  <Badge variant="outline" className="font-mono text-xs flex-shrink-0">{intake.jpd_issue_key}</Badge>
                                )}
                                <Link
                                  to={`/intake/${intake.id}`}
                                  className="font-medium text-foreground hover:underline"
                                >
                                  {intake.title}
                                </Link>
                              </div>
                              {intake.value_stream && (
                                <p className="text-xs text-muted-foreground mt-1">{intake.value_stream}</p>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={status.variant} className="gap-1">
                                <status.icon className="h-3 w-3" />
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              {intake.priority && (
                                <span className={cn('inline-block px-2 py-1 text-xs font-medium capitalize rounded', priorityColors[intake.priority as keyof typeof priorityColors])}>
                                  {intake.priority}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                              {intake.category || '—'}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                              {new Date(intake.updated_at).toLocaleDateString('de-DE')}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" asChild>
                                <Link to={`/intake/${intake.id}`}>
                                  <ArrowUpRight className="h-4 w-4" />
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
