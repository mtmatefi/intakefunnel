import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useIntakes } from '@/hooks/useIntakes';
import { useAllImpactScores } from '@/hooks/useImpactScores';
import { deliveryPathInfo } from '@/data/demo';
import type { IntakeStatus } from '@/types/intake';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  ArrowUpRight, 
  AlertTriangle,
  Loader2,
  Zap,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { cn } from '@/lib/utils';

const statusLabels: Record<IntakeStatus, string> = {
  draft: 'Entwurf',
  gathering_info: 'Interview',
  spec_generated: 'Spec bereit',
  pending_approval: 'Warten auf Review',
  approved: 'Genehmigt',
  rejected: 'Abgelehnt',
  exported: 'Exportiert',
  closed: 'Geschlossen',
};

const COLORS = ['hsl(var(--primary))', 'hsl(var(--warning))', 'hsl(var(--success))', 'hsl(var(--destructive))', 'hsl(var(--info))', 'hsl(var(--muted-foreground))', 'hsl(var(--secondary))', 'hsl(var(--accent))'];

export default function MetricsPage() {
  const { user } = useAuth();
  const { data: intakes = [], isLoading } = useIntakes();
  const { data: impactScores = [] } = useAllImpactScores();

  if (user?.role !== 'architect' && user?.role !== 'admin') {
    return (
      <AppLayout>
        <div className="p-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-warning" />
              <h2 className="text-xl font-bold mb-2">Zugriff beschränkt</h2>
              <p className="text-muted-foreground">Nur Architekten und Admins haben Zugriff.</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // Status distribution
  const statusCounts = intakes.reduce((acc, i) => {
    acc[i.status] = (acc[i.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusChartData = Object.entries(statusCounts).map(([status, count]) => ({
    name: statusLabels[status as IntakeStatus] || status,
    value: count,
  }));

  // Category distribution
  const categoryCounts = intakes.reduce((acc, i) => {
    const cat = i.category || 'Unbekannt';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categoryChartData = Object.entries(categoryCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Pipeline health
  const avgAge = intakes.length > 0
    ? intakes.reduce((sum, i) => sum + (Date.now() - new Date(i.created_at).getTime()), 0) / intakes.length / (1000 * 60 * 60 * 24)
    : 0;

  const pendingCount = intakes.filter(i => ['pending_approval', 'spec_generated'].includes(i.status)).length;
  
  // WSJF distribution
  const scoreMap = new Map(impactScores.map(s => [s.intake_id, s]));
  const scoredIntakes = intakes
    .filter(i => scoreMap.has(i.id))
    .map(i => ({
      title: i.title.substring(0, 30) + (i.title.length > 30 ? '...' : ''),
      wsjf: Number(scoreMap.get(i.id)!.wsjf_score),
      status: i.status,
    }))
    .sort((a, b) => b.wsjf - a.wsjf)
    .slice(0, 10);

  // Throughput - intakes per week (last 8 weeks)
  const now = Date.now();
  const weeklyData = Array.from({ length: 8 }, (_, i) => {
    const weekStart = now - (7 - i) * 7 * 24 * 60 * 60 * 1000;
    const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000;
    const created = intakes.filter(intake => {
      const t = new Date(intake.created_at).getTime();
      return t >= weekStart && t < weekEnd;
    }).length;
    const completed = intakes.filter(intake => {
      const t = new Date(intake.updated_at).getTime();
      return t >= weekStart && t < weekEnd && ['approved', 'exported', 'closed'].includes(intake.status);
    }).length;
    return {
      week: `KW ${Math.ceil((8 - (7 - i)) / 1)}`,
      Erstellt: created,
      Abgeschlossen: completed,
    };
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Metriken & Analytics</h1>
          <p className="text-muted-foreground">Pipeline-Gesundheit, Durchsatz und Priorisierung</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-2xl font-bold">{intakes.length}</div>
                  <p className="text-xs text-muted-foreground">Gesamt Intakes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-warning" />
                <div>
                  <div className="text-2xl font-bold">{pendingCount}</div>
                  <p className="text-xs text-muted-foreground">In der Pipeline</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-success" />
                <div>
                  <div className="text-2xl font-bold">{avgAge.toFixed(0)}d</div>
                  <p className="text-xs text-muted-foreground">Ø Alter</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-info" />
                <div>
                  <div className="text-2xl font-bold">{impactScores.length}</div>
                  <p className="text-xs text-muted-foreground">Bewertet (WSJF)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status-Verteilung</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name} (${value})`}
                  >
                    {statusChartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Weekly Throughput */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Wöchentlicher Durchsatz</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="week" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="Erstellt" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Abgeschlossen" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Intakes nach Kategorie</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={categoryChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="name" type="category" width={120} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* WSJF Ranking */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">WSJF-Ranking (Top 10)</CardTitle>
              <CardDescription>Höchster Score = höchste Priorität</CardDescription>
            </CardHeader>
            <CardContent>
              {scoredIntakes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Noch keine WSJF-Scores vergeben
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={scoredIntakes} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" className="text-xs" />
                    <YAxis dataKey="title" type="category" width={150} className="text-xs" />
                    <Tooltip />
                    <Bar dataKey="wsjf" fill="hsl(var(--warning))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
