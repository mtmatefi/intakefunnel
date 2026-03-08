import { useState, useEffect, useMemo } from 'react';
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
import {
  COMPLIANCE_FRAMEWORKS,
  FRAMEWORK_RISK_CATEGORIES,
  FRAMEWORK_TYPES,
  FRAMEWORK_AI_CONTEXT,
} from './ComplianceFrameworkTabs';
import type { Guideline, GuidelineInsert } from '@/hooks/useGuidelines';
import { useAllInitiativeLinks } from '@/hooks/useInitiativeLinks';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

  // Get domain-specific data based on selected framework
  const riskCategories = useMemo(
    () => FRAMEWORK_RISK_CATEGORIES[framework] || FRAMEWORK_RISK_CATEGORIES.general,
    [framework]
  );

  const typeOptions = useMemo(
    () => FRAMEWORK_TYPES[framework] || FRAMEWORK_TYPES._default,
    [framework]
  );

  // Reset type when framework changes if current type is not valid
  useEffect(() => {
    const validTypes = typeOptions.map((t) => t.value);
    if (!validTypes.includes(type)) {
      setType(validTypes[0]);
    }
  }, [framework, typeOptions]);

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
      setType(typeOptions[0]?.value || 'policy');
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
      const riskContext = selectedRisks.length > 0 ? `\nAusgewählte Risikokategorien: ${selectedRisks.join(', ')}` : '';
      const initiativeContext =
        selectedInitiatives.length > 0 && initiatives
          ? `\nVerknüpfte Initiativen aus Strategy Sculptor: ${initiatives
              .filter((i) => selectedInitiatives.includes(i.initiative_id))
              .map((i) => `${i.initiative_title} (${JSON.stringify(i.initiative_data)})`)
              .join('; ')}`
          : '';

      const frameworkLabel = COMPLIANCE_FRAMEWORKS.find((f) => f.id === framework)?.label || framework;
      const typeLabel = typeOptions.find((t) => t.value === type)?.label || type;
      const domainContext = FRAMEWORK_AI_CONTEXT[framework] || FRAMEWORK_AI_CONTEXT.general;

      const { data, error } = await supabase.functions.invoke('generate-spec', {
        body: {
          prompt: `Du bist ein erfahrener ${getExpertRole(framework)}. 
Erstelle eine umfassende, professionelle Guideline auf Deutsch.

## Kontext
- **Domain**: ${frameworkLabel}
- **Dokumenttyp**: ${typeLabel}
- **Name**: ${name || 'Noch nicht definiert'}
- **Beschreibung**: ${description || 'Nicht angegeben'}
- **Schweregrad**: ${severity}${riskContext}${initiativeContext}

## Fachspezifische Anforderungen
${domainContext}

## Ausgabeformat
Erstelle die Guideline im Markdown-Format. Sei präzise, praxisorientiert und referenziere die relevanten Standards/Frameworks.
Verwende konkrete Beispiele und messbare Kriterien wo möglich.

Wenn Initiativen verknüpft sind, leite konkrete Risiken, Maßnahmen und Architektur-Entscheidungen daraus ab.`,
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

  // Framework-specific placeholder for name
  const namePlaceholder = useMemo(() => {
    const placeholders: Record<string, string> = {
      enterprise_arch: 'z.B. Technology Radar Policy – Cloud-Native First',
      solution_arch: 'z.B. API Design Standard – RESTful Services v2',
      security: 'z.B. Zero Trust Network Access Policy',
      devops: 'z.B. CI/CD Pipeline Standard – Trunk-Based Development',
      itar: 'z.B. ITAR Technical Data Access Control Policy',
      ear_export: 'z.B. ECCN Classification Procedure',
      gdpr: 'z.B. Verarbeitungsverzeichnis-Richtlinie',
      iso27001: 'z.B. A.9 Zugangssteuerung – Passwort-Policy',
    };
    return placeholders[framework] || 'Name der Guideline';
  }, [framework]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Guideline bearbeiten' : 'Neue Guideline erstellen'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Passen Sie die Guideline an'
              : 'Erstellen Sie eine neue Guideline – optional mit KI-Unterstützung'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Row 1: Framework + Severity + Type */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Domain / Framework</Label>
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
              <Label className="text-xs font-medium">Schweregrad</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">🔴 Kritisch</SelectItem>
                  <SelectItem value="high">🟠 Hoch</SelectItem>
                  <SelectItem value="medium">🟡 Mittel</SelectItem>
                  <SelectItem value="low">🟢 Niedrig</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Dokumenttyp</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {typeOptions.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Name + Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={namePlaceholder} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Beschreibung</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Kurze Zusammenfassung der Guideline" />
          </div>

          {/* Domain-specific Risk/Topic Categories */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              {getCategoryLabel(framework)}
            </Label>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1">
              {riskCategories.map((risk) => (
                <Badge
                  key={risk}
                  variant={selectedRisks.includes(risk) ? 'default' : 'outline'}
                  className="cursor-pointer text-xs transition-colors"
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
              <Label className="text-xs font-medium">Verknüpfte Initiativen (Strategy Sculptor)</Label>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-1">
                {initiatives.map((init) => (
                  <Badge
                    key={init.initiative_id}
                    variant={selectedInitiatives.includes(init.initiative_id) ? 'default' : 'outline'}
                    className="cursor-pointer text-xs transition-colors"
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
            <Label className="text-xs font-medium">Review-Zyklus (Tage)</Label>
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
              <Label className="text-xs font-medium">Inhalt (Markdown)</Label>
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
                {isGenerating ? 'Generiere...' : `KI: ${getAIButtonLabel(framework)}`}
              </Button>
            </div>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={getContentPlaceholder(framework)}
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

// Helper functions
function getExpertRole(framework: string): string {
  const roles: Record<string, string> = {
    enterprise_arch: 'Enterprise Architect mit Expertise in TOGAF, Zachman und Business Capability Modeling',
    solution_arch: 'Solution Architect mit Expertise in Cloud-Native, Microservices, DDD und Arc42',
    security: 'Chief Information Security Officer (CISO) mit Expertise in NIST CSF, ISO 27001 und OWASP',
    devops: 'DevOps/SRE Lead mit Expertise in DORA Metrics, GitOps und Platform Engineering',
    itar: 'ITAR Compliance Officer mit Expertise in US Export Controls und Defense Trade',
    ear_export: 'Export Control Compliance Spezialist mit EAR und Sanctions Expertise',
    gdpr: 'Datenschutzbeauftragter mit DSGVO, BDSG und BSI Grundschutz Expertise',
    iso27001: 'ISO 27001 Lead Auditor mit ISMS Implementierungserfahrung',
    risk_management: 'Enterprise Risk Manager mit ISO 31000 und COSO ERM Expertise',
  };
  return roles[framework] || 'Governance & Compliance Experte';
}

function getCategoryLabel(framework: string): string {
  const labels: Record<string, string> = {
    enterprise_arch: 'Architecture Domains & Concerns',
    solution_arch: 'Design Patterns & Quality Attributes',
    security: 'Security Controls & Threat Categories',
    devops: 'DevOps Practices & Capabilities',
    itar: 'ITAR Compliance Areas',
    ear_export: 'Export Control Areas',
    gdpr: 'DSGVO Anforderungsbereiche',
    iso27001: 'ISO 27001 Annex A Controls',
    risk_management: 'Risikokategorien',
  };
  return labels[framework] || 'Risiko- & Themenkategorien';
}

function getAIButtonLabel(framework: string): string {
  const labels: Record<string, string> = {
    enterprise_arch: 'EA Principle generieren',
    solution_arch: 'Solution Pattern generieren',
    security: 'Security Policy generieren',
    devops: 'DevOps Standard generieren',
  };
  return labels[framework] || 'Guideline generieren';
}

function getContentPlaceholder(framework: string): string {
  const placeholders: Record<string, string> = {
    enterprise_arch: '# Architecture Principle\n\n## Statement\n...\n\n## Rationale\n...\n\n## Implications\n...',
    solution_arch: '# Solution Blueprint\n\n## Context\n...\n\n## Quality Goals\n...\n\n## Building Blocks\n...',
    security: '# Security Policy\n\n## Scope\n...\n\n## Controls\n...\n\n## Threat Model\n...',
    devops: '# Pipeline Standard\n\n## Stages\n...\n\n## Quality Gates\n...\n\n## SLOs\n...',
  };
  return placeholders[framework] || 'Guideline-Inhalt im Markdown-Format...';
}
