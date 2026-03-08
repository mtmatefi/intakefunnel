import { Card, CardContent } from '@/components/ui/card';
import { Shield, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import type { Guideline } from '@/hooks/useGuidelines';

interface Props {
  guidelines: Guideline[];
}

export function ComplianceStats({ guidelines }: Props) {
  const active = guidelines.filter((g) => g.is_active).length;
  const critical = guidelines.filter((g) => g.severity === 'critical' || g.severity === 'high').length;
  const overdue = guidelines.filter((g) => {
    if (!g.last_reviewed_at) return true;
    return new Date().getTime() - new Date(g.last_reviewed_at).getTime() > g.review_frequency_days * 86400000;
  }).length;
  const linked = guidelines.filter((g) => (g.linked_initiative_ids?.length ?? 0) > 0).length;

  const stats = [
    { label: 'Aktive Guidelines', value: active, total: guidelines.length, icon: Shield, color: 'text-primary' },
    { label: 'Kritisch/Hoch', value: critical, icon: AlertTriangle, color: 'text-destructive' },
    { label: 'Review fällig', value: overdue, icon: Clock, color: 'text-warning' },
    { label: 'Mit Initiativen verknüpft', value: linked, icon: CheckCircle2, color: 'text-primary' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <stat.icon className={`h-8 w-8 ${stat.color} shrink-0`} />
            <div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
