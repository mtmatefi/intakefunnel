import { useState } from 'react';
import jsPDF from 'jspdf';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { FileDown } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  intakeTitle: string;
  jpdKey?: string | null;
  spec?: any;
  routing?: { path: string; score: number; explanation_markdown?: string | null; score_json?: any } | null;
  transcript?: Array<{ speaker: string; message: string; timestamp: string }>;
}

export function PdfExportDialog({ intakeTitle, jpdKey, spec, routing, transcript }: Props) {
  const [open, setOpen] = useState(false);
  const [includeSpec, setIncludeSpec] = useState(true);
  const [includeRouting, setIncludeRouting] = useState(false);
  const [includeTranscript, setIncludeTranscript] = useState(false);

  const handleExport = () => {
    if (!includeSpec && !includeRouting && !includeTranscript) {
      toast.error('Bitte mindestens einen Abschnitt wählen');
      return;
    }

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 48;
    const maxWidth = pageWidth - margin * 2;
    let y = margin;

    const ensureSpace = (needed: number) => {
      if (y + needed > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    };

    const addText = (text: string, opts: { size?: number; bold?: boolean; gap?: number } = {}) => {
      const { size = 11, bold = false, gap = 4 } = opts;
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(String(text ?? ''), maxWidth);
      for (const line of lines) {
        ensureSpace(size + gap);
        doc.text(line, margin, y);
        y += size + gap;
      }
    };

    const addHeading = (text: string, level: 1 | 2 | 3 = 2) => {
      const sizes = { 1: 20, 2: 15, 3: 12 } as const;
      y += level === 1 ? 8 : 12;
      ensureSpace(sizes[level] + 8);
      addText(text, { size: sizes[level], bold: true, gap: 6 });
      y += 4;
    };

    const addBullets = (items: string[]) => {
      for (const item of items) {
        addText(`• ${item}`, { size: 11, gap: 4 });
      }
    };

    // Title page
    addText(intakeTitle, { size: 22, bold: true, gap: 8 });
    if (jpdKey) addText(jpdKey, { size: 11, gap: 4 });
    addText(`Generiert am ${new Date().toLocaleString('de-DE')}`, { size: 9, gap: 4 });

    // Spec
    if (includeSpec && spec) {
      addHeading('Spezifikation', 1);

      if (spec.problemStatement) {
        addHeading('Problemstellung', 2);
        addText(spec.problemStatement);
      }
      if (Array.isArray(spec.goals) && spec.goals.length) {
        addHeading('Ziele', 2);
        addBullets(spec.goals);
      }
      if (Array.isArray(spec.users) && spec.users.length) {
        addHeading('Nutzer', 2);
        addBullets(spec.users.map((u: any) =>
          typeof u === 'string' ? u : `${u.persona ?? ''}${u.context ? ` — ${u.context}` : ''}`,
        ));
      }
      if (Array.isArray(spec.acceptanceCriteria) && spec.acceptanceCriteria.length) {
        addHeading('Akzeptanzkriterien', 2);
        addBullets(spec.acceptanceCriteria);
      }
      if (Array.isArray(spec.risks) && spec.risks.length) {
        addHeading('Risiken', 2);
        addBullets(spec.risks.map((r: any) => (typeof r === 'string' ? r : r.description || JSON.stringify(r))));
      }
      if (spec.nfrs && typeof spec.nfrs === 'object') {
        addHeading('Nicht-funktionale Anforderungen', 2);
        for (const [k, v] of Object.entries(spec.nfrs)) {
          addText(`${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`);
        }
      }
    }

    // Routing
    if (includeRouting && routing) {
      doc.addPage();
      y = margin;
      addHeading('Routing-Analyse', 1);
      addText(`Empfohlener Pfad: ${routing.path}`, { bold: true });
      addText(`Score: ${routing.score}`);

      if (routing.score_json && typeof routing.score_json === 'object') {
        addHeading('Faktoren', 2);
        for (const [k, v] of Object.entries(routing.score_json as Record<string, number>)) {
          addText(`${k}: ${v}`);
        }
      }
      if (routing.explanation_markdown) {
        addHeading('Erklärung', 2);
        // Strip markdown tables/headers minimally
        const cleaned = routing.explanation_markdown
          .replace(/\|/g, ' ')
          .replace(/^#+\s*/gm, '')
          .replace(/\*\*/g, '');
        addText(cleaned);
      }
    }

    // Transcript
    if (includeTranscript && transcript && transcript.length) {
      doc.addPage();
      y = margin;
      addHeading('Transkript', 1);
      for (const msg of transcript) {
        const ts = new Date(msg.timestamp).toLocaleString('de-DE');
        addText(`${msg.speaker} • ${ts}`, { size: 9, bold: true, gap: 2 });
        addText(msg.message, { size: 11, gap: 6 });
      }
    }

    const safeName = intakeTitle.replace(/[^\w\-]+/g, '_').slice(0, 60);
    doc.save(`${safeName || 'intake'}.pdf`);
    setOpen(false);
    toast.success('PDF erstellt');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileDown className="mr-2 h-4 w-4" />
          PDF
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Als PDF exportieren</DialogTitle>
          <DialogDescription>Wähle aus, welche Abschnitte in das PDF aufgenommen werden sollen.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex items-center gap-3">
            <Checkbox id="pdf-spec" checked={includeSpec} onCheckedChange={(v) => setIncludeSpec(!!v)} disabled={!spec} />
            <Label htmlFor="pdf-spec" className="cursor-pointer">
              Spezifikation {!spec && <span className="text-xs text-muted-foreground">(nicht verfügbar)</span>}
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox id="pdf-routing" checked={includeRouting} onCheckedChange={(v) => setIncludeRouting(!!v)} disabled={!routing} />
            <Label htmlFor="pdf-routing" className="cursor-pointer">
              Routing-Analyse {!routing && <span className="text-xs text-muted-foreground">(nicht verfügbar)</span>}
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox id="pdf-transcript" checked={includeTranscript} onCheckedChange={(v) => setIncludeTranscript(!!v)} disabled={!transcript?.length} />
            <Label htmlFor="pdf-transcript" className="cursor-pointer">
              Transkript {!transcript?.length && <span className="text-xs text-muted-foreground">(nicht verfügbar)</span>}
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Abbrechen</Button>
          <Button onClick={handleExport}>
            <FileDown className="mr-2 h-4 w-4" />
            PDF erstellen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
