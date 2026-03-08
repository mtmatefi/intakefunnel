import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useGuidelineVersions, type GuidelineVersion } from '@/hooks/useGuidelineVersions';
import { History, ChevronDown, ChevronUp, ExternalLink, User, Calendar, FileText, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Props {
  guidelineId: string | undefined;
  guidelineName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const fieldLabels: Record<string, string> = {
  name: 'Name',
  description: 'Beschreibung',
  content_markdown: 'Inhalt',
  type: 'Typ',
  compliance_framework: 'Framework',
  severity: 'Schweregrad',
  risk_categories: 'Risikokategorien',
  review_frequency_days: 'Review-Frequenz (Tage)',
  is_active: 'Aktiv',
};

const sourceLabels: Record<string, string> = {
  manual: 'Manuell',
  guideline_chat: 'Chat-Assistent',
  intake_chat: 'Intake-Chat',
};

function DiffBlock({ field, oldVal, newVal }: { field: string; oldVal: any; newVal: any }) {
  const label = fieldLabels[field] || field;
  const formatValue = (v: any) => {
    if (v === null || v === undefined) return '—';
    if (Array.isArray(v)) return v.join(', ') || '—';
    return String(v);
  };

  const oldStr = formatValue(oldVal);
  const newStr = formatValue(newVal);

  return (
    <div className="rounded-md border border-border overflow-hidden text-sm">
      <div className="px-3 py-1.5 bg-muted/50 font-medium text-foreground">{label}</div>
      <div className="grid grid-cols-2 divide-x divide-border">
        <div className="px-3 py-2 bg-destructive/5">
          <span className="text-xs text-muted-foreground block mb-0.5">Vorher</span>
          <span className="text-foreground/70 whitespace-pre-wrap break-words line-clamp-4">{oldStr}</span>
        </div>
        <div className="px-3 py-2 bg-primary/5">
          <span className="text-xs text-muted-foreground block mb-0.5">Nachher</span>
          <span className="text-foreground whitespace-pre-wrap break-words line-clamp-4">{newStr}</span>
        </div>
      </div>
    </div>
  );
}

function VersionEntry({ version, isLatest }: { version: GuidelineVersion; isLatest: boolean }) {
  const [open, setOpen] = useState(isLatest);
  const changedFields = version.changed_fields || [];
  const previousValues = version.previous_values || {};

  const currentValues: Record<string, any> = {};
  for (const field of changedFields) {
    currentValues[field] = (version as any)[field];
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="relative pl-8">
        {/* Timeline dot */}
        <div className={`absolute left-0 top-2 w-4 h-4 rounded-full border-2 ${
          isLatest ? 'bg-primary border-primary' : 'bg-background border-muted-foreground/40'
        }`} />

        <CollapsibleTrigger asChild>
          <button className="w-full text-left group">
            <div className="flex items-center justify-between gap-2 py-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={isLatest ? 'default' : 'outline'} className="text-xs">
                  v{version.version_number}
                </Badge>
                <span className="text-sm font-medium text-foreground">
                  {version.change_reason}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {sourceLabels[version.change_source] || version.change_source}
                </Badge>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {changedFields.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {changedFields.length} Feld{changedFields.length !== 1 ? 'er' : ''}
                  </Badge>
                )}
                {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground pb-2">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(version.changed_at), 'dd. MMM yyyy, HH:mm', { locale: de })}
              </span>
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {version.changed_by.slice(0, 8)}…
              </span>
              {version.intake_id && (
                <span className="flex items-center gap-1 text-primary">
                  <ExternalLink className="h-3 w-3" />
                  Intake verknüpft
                </span>
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="space-y-2 pb-4">
            {changedFields.length > 0 ? (
              changedFields.map((field) => (
                <DiffBlock
                  key={field}
                  field={field}
                  oldVal={previousValues[field]}
                  newVal={currentValues[field]}
                />
              ))
            ) : (
              <div className="text-sm text-muted-foreground italic flex items-center gap-2 py-2">
                <FileText className="h-4 w-4" />
                Initiale Version – kein Diff verfügbar
              </div>
            )}

            {version.intake_id && (
              <div className="mt-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={`/intake/${version.intake_id}`} className="gap-1.5">
                    <ArrowRight className="h-3.5 w-3.5" />
                    Zum verknüpften Intake
                  </a>
                </Button>
              </div>
            )}
          </div>
        </CollapsibleContent>

        <Separator />
      </div>
    </Collapsible>
  );
}

export function GuidelineVersionHistory({ guidelineId, guidelineName, open, onOpenChange }: Props) {
  const { data: versions = [], isLoading } = useGuidelineVersions(guidelineId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Versionshistorie: {guidelineName}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          {isLoading ? (
            <div className="flex justify-center py-12 text-muted-foreground text-sm">
              Lade Versionen…
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Noch keine Versionshistorie vorhanden.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Änderungen werden automatisch versioniert.
              </p>
            </div>
          ) : (
            <div className="relative ml-2">
              {/* Timeline line */}
              <div className="absolute left-[7px] top-4 bottom-4 w-0.5 bg-border" />

              <div className="space-y-1">
                {versions.map((v, i) => (
                  <VersionEntry key={v.id} version={v} isLatest={i === 0} />
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
