import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useIntakes } from '@/hooks/useIntakes';
import { useAllImpactScores } from '@/hooks/useImpactScores';
import { deliveryPathInfo } from '@/data/demo';
import { ApprovalDialog } from '@/components/intake/ApprovalDialog';
import { ImpactScoreCard } from '@/components/intake/ImpactScoreCard';
import type { IntakeStatus } from '@/types/intake';
import { 
  CheckCircle,
  Clock,
  Route,
  ArrowUpRight,
  AlertTriangle,
  Loader2,
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ArchitectQueuePage() {
  const { user } = useAuth();
  const { data: intakes = [], isLoading } = useIntakes();
  const { data: impactScores = [] } = useAllImpactScores();
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  if (user?.role !== 'architect' && user?.role !== 'admin') {
    return (
      <AppLayout>
        <div className="p-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-warning" />
              <h2 className="text-xl font-bold mb-2">Zugriff beschränkt</h2>
              <p className="text-muted-foreground">
                Nur Architekten und Admins haben Zugriff auf diese Seite.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const pendingIntakes = intakes.filter(i => i.status === 'pending_approval');
  const specReadyIntakes = intakes.filter(i => i.status === 'spec_generated');
  const approvedIntakes = intakes.filter(i => i.status === 'approved');
  const exportedIntakes = intakes.filter(i => i.status === 'exported');

  const displayIntakes = filter === 'pending' 
    ? [...pendingIntakes, ...specReadyIntakes]
    : intakes.filter(i => !['draft', 'closed'].includes(i.status));

  // Sort by WSJF score (highest first)
  const scoreMap = new Map(impactScores.map(s => [s.intake_id, s]));
  const sortedIntakes = [...displayIntakes].sort((a, b) => {
    const scoreA = scoreMap.get(a.id)?.wsjf_score ?? -1;
    const scoreB = scoreMap.get(b.id)?.wsjf_score ?? -1;
    return Number(scoreB) - Number(scoreA);
  });

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Architect Queue</h1>
            <p className="text-muted-foreground">
              Intakes bewerten, priorisieren und genehmigen
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant={filter === 'pending' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilter('pending')}
            >
              Offen ({pendingIntakes.length + specReadyIntakes.length})
            </Button>
            <Button 
              variant={filter === 'all' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilter('all')}
            >
              Alle aktiven
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-warning">{pendingIntakes.length}</div>
              <p className="text-xs text-muted-foreground">Warten auf Review</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-info">{specReadyIntakes.length}</div>
              <p className="text-xs text-muted-foreground">Spec bereit</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-success">{approvedIntakes.length}</div>
              <p className="text-xs text-muted-foreground">Genehmigt</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{exportedIntakes.length}</div>
              <p className="text-xs text-muted-foreground">Exportiert</p>
            </CardContent>
          </Card>
        </div>

        {/* Intake Cards */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        ) : sortedIntakes.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Keine offenen Intakes. Alles erledigt!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedIntakes.map((intake) => {
              const score = scoreMap.get(intake.id);
              return (
                <Card key={intake.id} className="border-l-4" style={{
                  borderLeftColor: intake.status === 'pending_approval' 
                    ? 'hsl(var(--warning))' 
                    : intake.status === 'approved' 
                    ? 'hsl(var(--success))' 
                    : 'hsl(var(--border))'
                }}>
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {intake.jpd_issue_key && (
                            <Badge variant="outline" className="font-mono text-xs">{intake.jpd_issue_key}</Badge>
                          )}
                          <Link 
                            to={`/intake/${intake.id}`}
                            className="font-medium text-foreground hover:underline truncate"
                          >
                            {intake.title}
                          </Link>
                          <Badge variant={
                            intake.status === 'pending_approval' ? 'default' : 
                            intake.status === 'approved' ? 'secondary' : 'outline'
                          }>
                            {intake.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {intake.value_stream} • {intake.category} • {new Date(intake.updated_at).toLocaleDateString('de-DE')}
                        </p>
                        
                        {/* WSJF Score inline */}
                        {score && (
                          <div className="mt-2">
                            <ImpactScoreCard intakeId={intake.id} compact />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/intake/${intake.id}`}>
                            <ArrowUpRight className="h-4 w-4 mr-1" />
                            Details
                          </Link>
                        </Button>
                        {intake.status === 'pending_approval' && (
                          <ApprovalDialog 
                            intakeId={intake.id} 
                            intakeTitle={intake.title}
                          />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
