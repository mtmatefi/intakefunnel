import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, X } from 'lucide-react';
import { COMPLIANCE_FRAMEWORKS } from './ComplianceFrameworkTabs';
import type { Guideline, GuidelineInsert } from '@/hooks/useGuidelines';
import { useAllInitiativeLinks } from '@/hooks/useInitiativeLinks';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const RISK_CATEGORIES = [
  'Datenklassifizierung',
  'Exportkontrolle',
  'Zugangskontrolle',
  'Verschlüsselung',
  'Audit-Trail',
  'Verfügbarkeit',
  'Incident Response',
  'Drittanbieter-Risiko',
  'Intellectual Property',
  'Regulatorisch',
  'Operationell',
  'Strategisch',
];

const GUIDELINE_TYPES = [
  'policy',
  'standard',
  'procedure',
  'control',
  'checklist',
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guideline?: Guideline | null;
  defaultFramework?: string;
  onSave: (data: GuidelineInsert | (Partial<Guideline> & { id: string })) => void;
  userId: string;
}

export function GuidelineEditorDialog({
  open,
  onOpenChange,
  guideline,
  defaultFramework,
  onSave,
  userId,
}: Props) {
  const isEditing = !!guideline;
  const { data: initiatives } = useAllInitiativeLinks();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [framework, setFramework] = useState('general');
  const [severity, setSeverity] = useState('medium');
  const [type, setType] = useState('policy');
  const [selectedRisks, setSelectedRisks] = useState<string[]>([]);
  const [selectedInitiatives, setSelectedInitiatives] = useState<string[]>([]);
  const [reviewDays, setReviewDays] = useState(365);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (guideline) {
      setName(guideline.name);
      setDescription(guideline.description || '');
      setContent(guideline.content_markdown);
      setFramework(guideline.compliance_framework);
      setSeverity(guideline.severity);
      setType(guideline.type);
      setSelectedRisks(guideline.risk_categories || []);
      setSelectedInitiatives(guideline.linked_initiative_ids || []);
      setReviewDays(guideline.review_frequency_days);
    } else {
      setName('');
      setDescription('');
      setContent('');
      setFramework(defaultFramework && defaultFramework !== 'all' ? defaultFramework : 'general');
      setSeverity('medium');
      setType('policy');
      setSelectedRisks([]);
      setSelectedInitiatives([]);
      setReviewDays(365);
    }
  }, [guideline, defaultFramework, open]);

  const toggleRisk = (risk: string) => {
    setSelectedRisks((prev) =>
      prev.includes(risk) ? prev.filter((r) => r !== risk) : [...prev, risk]
    );
  };

  const toggleInitiative = (id: string) => {
    setSelectedInitiatives((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleAIGenerate = async () => {
    if (!name && !framework) {
      toast.error('Bitte geben Sie mindestens einen Namen oder wählen Sie ein Framework');
      return;
    }

    setIsGenerating(true);
    try {
      const riskContext = selectedRisks.length > 0 ? `\nRisikokategorien: ${selectedRisks.join(', ')}` : '';
      const initiativeContext =
        selectedInitiatives.length > 0 && initiatives
          ? `\nVerknüpfte Initiativen: ${initiatives
              .filter((i) => selectedInitiatives.includes(i.initiative_id))
              .map((i) => `${i.initiative_title} (${JSON.stringify(i.initiative_data)})`)
              .join('; ')}`
          : '';

      const frameworkLabel = COMPLIANCE_FRAMEWORKS.find((f) => f.id === framework)?.label || framework;

      const { data, error } = await supabase.functions.invoke('generate-spec', {
        body: {
          prompt: `Du bist ein Compliance- und Security-Experte. Erstelle eine umfassende Guideline/Policy auf Deutsch für folgendes:

Framework: ${frameworkLabel}
Typ: ${type}
Name: ${name || 'Noch nicht definiert'}
Beschreibung: ${description || 'Nicht angegeben'}
Schweregrad: ${severity}${riskContext}${initiativeContext}

Erstelle eine vollständige, professionelle Guideline im Markdown-Format mit:
1. **Zweck & Geltungsbereich**
2. **Definitionen**
3. **Anforderungen** (nummeriert)
4. **Kontrollen & Maßnahmen**
5. **Verantwortlichkeiten** (RACI-Matrix falls relevant)
6. **Ausnahmen & Eskalation**
7. **Review-Zyklus & Aktualisierung**

Bei ITAR: Beachte ITAR §120-130, Defense Articles, Technical Data, Export Licensing.
Bei Export Control: Beachte EAR, CCL, ECCN Klassifizierung.
Bei Security: Beachte ISO 27001 Controls, NIST CSF.
Bei DSGVO: Beachte Art. 5-49 DSGVO, TOM, DSFA.

Wenn Initiativen verknüpft sind, leite konkrete Risiken und Maßnahmen daraus ab.`,
        },
      });

      if (error) throw error;

      const generatedContent = data?.spec?.markdown || data?.markdown || data?.content || '';
      if (generatedContent) {
        setContent(generatedContent);
        if (!name && data?.spec?.title) setName(data.spec.title);
        toast.success('Guideline wurde von KI generiert');
      } else {
        toast.error('KI konnte keine Guideline generieren');
      }
    } catch (err: any) {
      console.error('AI generation error:', err);
      toast.error('Fehler bei der KI-Generierung: ' + (err.message || 'Unbekannt'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Name ist erforderlich');
      return;
    }
    if (!content.trim()) {
      toast.error('Inhalt ist erforderlich');
      return;
    }

    if (isEditing && guideline) {
      onSave({
        id: guideline.id,
        name,
        description: description || null,
        content_markdown: content,
        compliance_framework: framework,
        severity,
        type,
        risk_categories: selectedRisks,
        linked_initiative_ids: selectedInitiatives,
        review_frequency_days: reviewDays,
      } as any);
    } else {
      onSave({
        name,
        description: description || undefined,
        content_markdown: content,
        compliance_framework: framework,
        severity,
        type,
        created_by: userId,
        risk_categories: selectedRisks,
        linked_initiative_ids: selectedInitiatives,
        review_frequency_days: reviewDays,
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Guideline bearbeiten' : 'Neue Guideline erstellen'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Passen Sie die Guideline an'
              : 'Erstellen Sie eine neue Compliance-Guideline – optional mit KI-Unterstützung'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Row 1: Framework + Severity + Type */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Framework</Label>
              <Select value={framework} onValueChange={setFramework}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMPLIANCE_FRAMEWORKS.filter((f) => f.id !== 'all').map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Schweregrad</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Kritisch</SelectItem>
                  <SelectItem value="high">Hoch</SelectItem>
                  <SelectItem value="medium">Mittel</SelectItem>
                  <SelectItem value="low">Niedrig</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Typ</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="policy">Policy</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="procedure">Procedure</SelectItem>
                  <SelectItem value="control">Control</SelectItem>
                  <SelectItem value="checklist">Checklist</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Name + Description */}
          <div className="space-y-1.5">
            <Label className="text-xs">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="z.B. ITAR Technical Data Access Control Policy" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Beschreibung</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Kurze Zusammenfassung der Guideline" />
          </div>

          {/* Risk Categories */}
          <div className="space-y-1.5">
            <Label className="text-xs">Risikokategorien</Label>
            <div className="flex flex-wrap gap-1.5">
              {RISK_CATEGORIES.map((risk) => (
                <Badge
                  key={risk}
                  variant={selectedRisks.includes(risk) ? 'default' : 'outline'}
                  className="cursor-pointer text-xs"
                  onClick={() => toggleRisk(risk)}
                >
                  {risk}
                  {selectedRisks.includes(risk) && <X className="h-3 w-3 ml-1" />}
                </Badge>
              ))}
            </div>
          </div>

          {/* Linked Initiatives from Strategy Sculptor */}
          {initiatives && initiatives.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">Verknüpfte Initiativen (Strategy Sculptor)</Label>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {initiatives.map((init) => (
                  <Badge
                    key={init.initiative_id}
                    variant={selectedInitiatives.includes(init.initiative_id) ? 'default' : 'outline'}
                    className="cursor-pointer text-xs"
                    onClick={() => toggleInitiative(init.initiative_id)}
                  >
                    {init.initiative_title}
                    {selectedInitiatives.includes(init.initiative_id) && <X className="h-3 w-3 ml-1" />}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Review Frequency */}
          <div className="space-y-1.5">
            <Label className="text-xs">Review-Zyklus (Tage)</Label>
            <Input
              type="number"
              value={reviewDays}
              onChange={(e) => setReviewDays(Number(e.target.value))}
              min={30}
              max={730}
            />
          </div>

          {/* Content with AI button */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Inhalt (Markdown)</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAIGenerate}
                disabled={isGenerating}
                className="gap-1.5 text-xs"
              >
                {isGenerating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {isGenerating ? 'Generiere...' : 'KI-Guideline generieren'}
              </Button>
            </div>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Guideline-Inhalt im Markdown-Format..."
              className="min-h-[200px] font-mono text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button onClick={handleSave}>{isEditing ? 'Aktualisieren' : 'Erstellen'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
