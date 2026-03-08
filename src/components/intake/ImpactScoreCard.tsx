import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useImpactScore, useUpsertImpactScore } from '@/hooks/useImpactScores';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  TrendingUp, 
  Clock, 
  ShieldCheck, 
  Target, 
  Zap, 
  Save, 
  Loader2,
  BarChart3,
  Edit3,
} from 'lucide-react';

interface ImpactScoreCardProps {
  intakeId: string;
  compact?: boolean;
}

const dimensions = [
  { key: 'business_value', label: 'Business Value', icon: TrendingUp, description: 'Umsatz, Kosten, Kundenzufriedenheit', color: 'text-success' },
  { key: 'time_criticality', label: 'Zeitkritikalität', icon: Clock, description: 'Wie dringend ist die Umsetzung?', color: 'text-warning' },
  { key: 'risk_reduction', label: 'Risikoreduktion', icon: ShieldCheck, description: 'Compliance, Sicherheit, technische Schulden', color: 'text-info' },
  { key: 'strategic_fit', label: 'Strategischer Fit', icon: Target, description: 'Passt zur Unternehmensstrategie', color: 'text-primary' },
  { key: 'effort_estimate', label: 'Aufwand (Job Size)', icon: Zap, description: 'Geschätzter Implementierungsaufwand', color: 'text-destructive' },
] as const;

function getWSJFLabel(score: number): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
  if (score >= 8) return { label: 'Höchste Priorität', variant: 'destructive' };
  if (score >= 4) return { label: 'Hohe Priorität', variant: 'default' };
  if (score >= 2) return { label: 'Mittlere Priorität', variant: 'secondary' };
  return { label: 'Niedrige Priorität', variant: 'outline' };
}

export function ImpactScoreCard({ intakeId, compact = false }: ImpactScoreCardProps) {
  const { user } = useAuth();
  const { data: existingScore, isLoading } = useImpactScore(intakeId);
  const upsert = useUpsertImpactScore();
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState({
    business_value: 50,
    time_criticality: 50,
    risk_reduction: 50,
    strategic_fit: 50,
    effort_estimate: 50,
    notes: '',
  });

  const canEdit = user?.role === 'architect' || user?.role === 'admin';

  useEffect(() => {
    if (existingScore) {
      setValues({
        business_value: existingScore.business_value,
        time_criticality: existingScore.time_criticality,
        risk_reduction: existingScore.risk_reduction,
        strategic_fit: existingScore.strategic_fit,
        effort_estimate: existingScore.effort_estimate,
        notes: existingScore.notes || '',
      });
    }
  }, [existingScore]);

  const costOfDelay = values.business_value + values.time_criticality + values.risk_reduction + values.strategic_fit;
  const wsjf = values.effort_estimate > 0 ? (costOfDelay / values.effort_estimate) : 0;
  const wsjfInfo = getWSJFLabel(wsjf);

  const handleSave = async () => {
    try {
      await upsert.mutateAsync({
        intakeId,
        ...values,
      });
      toast.success('Impact Score gespeichert');
      setEditing(false);
    } catch (error) {
      toast.error('Fehler beim Speichern');
    }
  };

  if (isLoading) return null;

  // Compact view for dashboard/queue
  if (compact && existingScore) {
    return (
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-bold">{Number(existingScore.wsjf_score).toFixed(1)}</span>
        <Badge variant={wsjfInfo.variant} className="text-xs">{wsjfInfo.label}</Badge>
      </div>
    );
  }

  if (compact && !existingScore) {
    return (
      <span className="text-xs text-muted-foreground">Kein Score</span>
    );
  }

  // Show read-only score if exists and not editing
  if (existingScore && !editing) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Impact & Priorisierung
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={wsjfInfo.variant} className="text-sm px-3 py-1">
                WSJF: {Number(existingScore.wsjf_score).toFixed(1)} — {wsjfInfo.label}
              </Badge>
              {canEdit && (
                <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                  <Edit3 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            {dimensions.map((dim) => (
              <div key={dim.key} className="text-center space-y-1">
                <dim.icon className={`h-5 w-5 mx-auto ${dim.color}`} />
                <div className="text-lg font-bold">{values[dim.key as keyof typeof values]}</div>
                <p className="text-xs text-muted-foreground leading-tight">{dim.label}</p>
              </div>
            ))}
          </div>
          {existingScore.notes && (
            <p className="text-sm text-muted-foreground mt-3 pt-3 border-t border-border">{existingScore.notes}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  // No score yet — prompt to create (only for architects/admins)
  if (!existingScore && !canEdit) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6 text-center py-8">
          <BarChart3 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Impact Score wird vom Architekten vergeben</p>
        </CardContent>
      </Card>
    );
  }

  // Edit/Create form
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Impact & Priorisierung (WSJF)
        </CardTitle>
        <CardDescription>
          Bewerten Sie Business Value, Dringlichkeit und Aufwand für die automatische Priorisierung
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* WSJF Preview */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Cost of Delay: {costOfDelay}</p>
            <p className="text-sm text-muted-foreground">Job Size: {values.effort_estimate}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{wsjf.toFixed(1)}</p>
            <Badge variant={wsjfInfo.variant}>{wsjfInfo.label}</Badge>
          </div>
        </div>

        <Separator />

        {/* Sliders */}
        {dimensions.map((dim) => (
          <div key={dim.key} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm">
                <dim.icon className={`h-4 w-4 ${dim.color}`} />
                {dim.label}
              </Label>
              <span className="text-sm font-bold w-8 text-right">
                {values[dim.key as keyof typeof values]}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{dim.description}</p>
            <Slider
              value={[values[dim.key as keyof typeof values] as number]}
              onValueChange={([v]) => setValues(prev => ({ ...prev, [dim.key]: v }))}
              min={dim.key === 'effort_estimate' ? 1 : 0}
              max={100}
              step={5}
            />
          </div>
        ))}

        <div className="space-y-2">
          <Label>Notizen (optional)</Label>
          <Textarea
            placeholder="Begründung der Bewertung..."
            value={values.notes}
            onChange={(e) => setValues(prev => ({ ...prev, notes: e.target.value }))}
            rows={2}
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={upsert.isPending} className="flex-1">
            {upsert.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Score speichern
          </Button>
          {existingScore && (
            <Button variant="outline" onClick={() => setEditing(false)}>
              Abbrechen
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
