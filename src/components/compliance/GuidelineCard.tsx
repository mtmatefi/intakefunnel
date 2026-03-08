import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Pencil, Trash2, Link2, Clock, AlertTriangle } from 'lucide-react';
import type { Guideline } from '@/hooks/useGuidelines';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

const severityColors: Record<string, string> = {
  critical: 'bg-destructive text-destructive-foreground',
  high: 'bg-destructive/80 text-destructive-foreground',
  medium: 'bg-warning text-warning-foreground',
  low: 'bg-secondary text-secondary-foreground',
};

const frameworkLabels: Record<string, string> = {
  itar: 'ITAR',
  ear_export: 'Export Control (EAR)',
  security: 'Security',
  gdpr: 'DSGVO/GDPR',
  iso27001: 'ISO 27001',
  risk_management: 'Risiko-Management',
  general: 'Allgemein',
};

interface Props {
  guideline: Guideline;
  onEdit: (g: Guideline) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
}

export function GuidelineCard({ guideline, onEdit, onDelete, onToggleActive }: Props) {
  const isOverdue = guideline.last_reviewed_at
    ? new Date().getTime() - new Date(guideline.last_reviewed_at).getTime() >
      guideline.review_frequency_days * 86400000
    : true;

  return (
    <Card className="transition-all hover:shadow-md border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <Badge variant="outline" className="text-xs">
                {frameworkLabels[guideline.compliance_framework] || guideline.compliance_framework}
              </Badge>
              <Badge className={`text-xs ${severityColors[guideline.severity] || severityColors.medium}`}>
                {guideline.severity.toUpperCase()}
              </Badge>
              {guideline.type && (
                <Badge variant="secondary" className="text-xs">
                  {guideline.type}
                </Badge>
              )}
              {isOverdue && (
                <Badge variant="destructive" className="text-xs gap-1">
                  <Clock className="h-3 w-3" /> Review fällig
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-foreground truncate">{guideline.name}</h3>
            {guideline.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{guideline.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Switch
              checked={guideline.is_active}
              onCheckedChange={(checked) => onToggleActive(guideline.id, checked)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground mb-3">
          {(guideline.risk_categories?.length ?? 0) > 0 && (
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {guideline.risk_categories.join(', ')}
            </span>
          )}
          {(guideline.linked_initiative_ids?.length ?? 0) > 0 && (
            <span className="flex items-center gap-1">
              <Link2 className="h-3 w-3" />
              {guideline.linked_initiative_ids.length} Initiativen verknüpft
            </span>
          )}
          <span>
            Aktualisiert {formatDistanceToNow(new Date(guideline.updated_at), { addSuffix: true, locale: de })}
          </span>
        </div>

        <div className="bg-muted/30 rounded p-3 text-sm text-foreground/80 max-h-24 overflow-hidden relative">
          <div className="line-clamp-3 whitespace-pre-wrap">{guideline.content_markdown}</div>
          <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-muted/30 to-transparent" />
        </div>

        <div className="flex justify-end gap-2 mt-3">
          <Button variant="ghost" size="sm" onClick={() => onEdit(guideline)}>
            <Pencil className="h-3.5 w-3.5 mr-1" /> Bearbeiten
          </Button>
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => onDelete(guideline.id)}>
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Löschen
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
