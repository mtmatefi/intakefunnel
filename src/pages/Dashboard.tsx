import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useIntakes } from '@/hooks/useIntakes';
import { useAllImpactScores } from '@/hooks/useImpactScores';
import { ImpactScoreCard } from '@/components/intake/ImpactScoreCard';
import { deliveryPathInfo } from '@/data/demo';
import type { IntakeStatus } from '@/types/intake';
import { 
  PlusCircle, Search, Filter, ArrowUpRight, Clock, CheckCircle, AlertCircle,
  FileText, Send, Loader2, BarChart3, TrendingUp,
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

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: intakes = [], isLoading } = useIntakes();
  const { data: impactScores = [] } = useAllImpactScores();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'updated' | 'wsjf' | 'created'>('updated');

  const scoreMap = new Map(impactScores.map(s => [s.intake_id, s]));

  const filteredIntakes = intakes.filter(intake => {
    const matchesSearch = intake.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (intake.jpd_issue_key || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || intake.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Sorting
  const sortedIntakes = [...filteredIntakes].sort((a, b) => {
    if (sortBy === 'wsjf') {
      const sA = Number(scoreMap.get(a.id)?.wsjf_score ?? 0);
      const sB = Number(scoreMap.get(b.id)?.wsjf_score ?? 0);
      return sB - sA;
    }
    if (sortBy === 'created') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  const stats = {
    total: intakes.length,
    pending: intakes.filter(i => i.status === 'pending_approval').length,
    approved: intakes.filter(i => i.status === 'approved').length,
    inProgress: intakes.filter(i => ['gathering_info', 'spec_generated'].includes(i.status)).length,
  };

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">
              {user?.role === 'requester' ? 'Ihre Software-Intake-Anfragen' : 'Alle Intake-Anfragen verwalten'}
            </p>
          </div>
          <Button asChild>
            <Link to="/intake/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Neuer Intake
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-xs text-muted-foreground">Gesamt</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-info" />
                <div>
                  <div className="text-2xl font-bold">{stats.inProgress}</div>
                  <p className="text-xs text-muted-foreground">In Bearbeitung</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-warning" />
                <div>
                  <div className="text-2xl font-bold text-warning">{stats.pending}</div>
                  <p className="text-xs text-muted-foreground">Zur Prüfung</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <div>
                  <div className="text-2xl font-bold text-success">{stats.approved}</div>
                  <p className="text-xs text-muted-foreground">Genehmigt</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
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
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px]">
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
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Sortierung" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="updated">Zuletzt aktualisiert</SelectItem>
                    <SelectItem value="created">Zuletzt erstellt</SelectItem>
                    <SelectItem value="wsjf">WSJF Score ↓</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                    <TableHead className="min-w-[200px] sm:w-[300px]">Titel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Priorität</TableHead>
                    <TableHead className="hidden md:table-cell">WSJF</TableHead>
                    <TableHead className="hidden md:table-cell">Aktualisiert</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedIntakes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Keine Intakes gefunden. Erstellen Sie Ihren ersten Intake.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedIntakes.map((intake) => {
                      const status = statusConfig[intake.status];
                      const score = scoreMap.get(intake.id);
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
                              <p className="text-xs text-muted-foreground mt-1">{intake.value_stream} • {intake.category}</p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={status.variant} className="gap-1">
                              <status.icon className="h-3 w-3" />
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {intake.priority && (
                              <span className={cn('hidden sm:inline-block px-2 py-1 text-xs font-medium capitalize rounded', priorityColors[intake.priority as keyof typeof priorityColors])}>
                                {intake.priority}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {score ? (
                              <span className="text-sm font-bold">{Number(score.wsjf_score).toFixed(1)}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
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
            )}
          </CardContent>
        </Card>

        {/* Delivery Path Legend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Delivery Paths</CardTitle>
            <CardDescription>So werden Intakes basierend auf Komplexität und Anforderungen geroutet</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {Object.entries(deliveryPathInfo).map(([key, info]) => (
                <div key={key} className="flex items-start gap-2 p-2 border border-border rounded">
                  <div className="w-3 h-3 mt-1 flex-shrink-0 rounded-full" style={{ backgroundColor: `hsl(var(--${info.color}))` }} />
                  <div>
                    <p className="font-medium text-sm">{info.label}</p>
                    <p className="text-xs text-muted-foreground">{info.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
