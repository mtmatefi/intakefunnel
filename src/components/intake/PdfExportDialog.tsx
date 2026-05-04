import { useState } from 'react';
import jsPDF from 'jspdf';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  intakeTitle: string;
  jpdKey?: string | null;
  intakeMeta?: {
    status?: string;
    priority?: string | null;
    valueStream?: string | null;
    category?: string | null;
    createdAt?: string;
    updatedAt?: string;
  };
  spec?: any;
  routing?: { path: string; score: number; explanation_markdown?: string | null; score_json?: any } | null;
  transcript?: Array<{ id?: string; speaker: string; message: string; timestamp: string }>;
}

// Brand palette (light, printable theme)
const COLORS = {
  primary: [184, 144, 67] as const,        // Gold (matches --primary)
  primaryDark: [120, 90, 35] as const,
  accent: [54, 168, 153] as const,         // Teal
  text: [25, 32, 45] as const,
  muted: [110, 120, 135] as const,
  light: [245, 246, 249] as const,
  border: [220, 224, 232] as const,
  success: [34, 160, 90] as const,
  warning: [217, 145, 30] as const,
  destructive: [212, 60, 70] as const,
  info: [40, 145, 220] as const,
  white: [255, 255, 255] as const,
};

export function PdfExportDialog({ intakeTitle, jpdKey, intakeMeta, spec, routing, transcript }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [includeSpec, setIncludeSpec] = useState(true);
  const [includeRouting, setIncludeRouting] = useState(true);
  const [includeTranscript, setIncludeTranscript] = useState(false);

  const handleExport = async () => {
    if (!includeSpec && !includeRouting && !includeTranscript) {
      toast.error('Bitte mindestens einen Abschnitt wählen');
      return;
    }
    setBusy(true);
    try {
      await generatePdf({
        intakeTitle, jpdKey, intakeMeta, spec, routing, transcript,
        sections: { spec: includeSpec, routing: includeRouting, transcript: includeTranscript },
      });
      setOpen(false);
      toast.success('PDF erstellt');
    } catch (e) {
      console.error(e);
      toast.error('PDF Erstellung fehlgeschlagen');
    } finally {
      setBusy(false);
    }
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
          <DialogDescription>
            Ausführlicher Export im Corporate-Design. Wähle, welche Abschnitte enthalten sein sollen.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <SectionToggle id="pdf-spec" label="Spezifikation" available={!!spec}
            checked={includeSpec} onChange={setIncludeSpec} />
          <SectionToggle id="pdf-routing" label="Routing-Analyse" available={!!routing}
            checked={includeRouting} onChange={setIncludeRouting} />
          <SectionToggle id="pdf-transcript" label="Interview-Transkript" available={!!transcript?.length}
            checked={includeTranscript} onChange={setIncludeTranscript} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Abbrechen</Button>
          <Button onClick={handleExport} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
            PDF erstellen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SectionToggle({ id, label, available, checked, onChange }: {
  id: string; label: string; available: boolean; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <Checkbox id={id} checked={checked && available} disabled={!available}
        onCheckedChange={(v) => onChange(!!v)} />
      <Label htmlFor={id} className="cursor-pointer">
        {label} {!available && <span className="text-xs text-muted-foreground">(nicht verfügbar)</span>}
      </Label>
    </div>
  );
}

// =====================================================================
// PDF Generation
// =====================================================================

interface GenOpts {
  intakeTitle: string;
  jpdKey?: string | null;
  intakeMeta?: Props['intakeMeta'];
  spec?: any;
  routing?: Props['routing'];
  transcript?: Props['transcript'];
  sections: { spec: boolean; routing: boolean; transcript: boolean };
}

async function generatePdf(opts: GenOpts) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const M = { top: 70, bottom: 50, left: 48, right: 48 };
  const contentW = pw - M.left - M.right;

  const ctx = {
    doc, pw, ph, M, contentW,
    y: M.top,
    page: 1,
    title: opts.intakeTitle,
    jpdKey: opts.jpdKey || undefined,
    sectionLabel: 'Übersicht' as string,
  };

  // ---- Helpers ----
  // Sanitize: jsPDF default fonts (helvetica) only support WinAnsi (Latin-1).
  // Strip emojis, symbols, control chars, zero-width chars and characters > U+00FF.
  // Replace common typographic chars with WinAnsi equivalents.
  const clean = (raw: unknown): string => {
    if (raw == null) return '';
    let s = String(raw);
    // Normalize and replace common typographic punctuation
    s = s.normalize('NFKC')
      .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
      .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/\u2026/g, '...')
      .replace(/[\u00A0\u202F\u2007]/g, ' ')
      // Bullets / arrows that we keep as ASCII
      .replace(/[\u2022\u25CF\u25AA\u25A0]/g, '-')
      .replace(/[\u2192\u27A1]/g, '->')
      // Zero-width / bidi / variation selectors
      .replace(/[\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF]/g, '')
      .replace(/[\uFE00-\uFE0F]/g, '');
    // Drop surrogate pairs (emoji etc.)
    s = s.replace(/[\uD800-\uDFFF]./g, '');
    // Drop everything outside Latin-1 (keeps ä ö ü ß é à etc.)
    s = s.replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '');
    // Collapse whitespace runs but keep newlines
    s = s.replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n');
    return s.trim();
  };

  const setColor = (rgb: readonly number[], type: 'fill' | 'text' | 'draw' = 'text') => {
    const [r, g, b] = rgb;
    if (type === 'fill') doc.setFillColor(r, g, b);
    else if (type === 'draw') doc.setDrawColor(r, g, b);
    else doc.setTextColor(r, g, b);
  };

  const drawHeader = () => {
    // Top brand strip
    setColor(COLORS.primary, 'fill');
    doc.rect(0, 0, pw, 6, 'F');
    // Header text
    setColor(COLORS.muted, 'text');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Intake Funnel`, M.left, 26);
    setColor(COLORS.text, 'text');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    const headerTitle = ctx.jpdKey ? `${clean(ctx.jpdKey)} - ${clean(ctx.title)}` : clean(ctx.title);
    const truncated = doc.splitTextToSize(headerTitle, contentW * 0.7)[0];
    doc.text(truncated, M.left, 40);
    // Section label right
    setColor(COLORS.muted, 'text');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(clean(ctx.sectionLabel), pw - M.right, 40, { align: 'right' });
    // Divider
    setColor(COLORS.border, 'draw');
    doc.setLineWidth(0.5);
    doc.line(M.left, 50, pw - M.right, 50);
  };

  const drawFooter = () => {
    setColor(COLORS.border, 'draw');
    doc.setLineWidth(0.5);
    doc.line(M.left, ph - 32, pw - M.right, ph - 32);
    setColor(COLORS.muted, 'text');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Generiert am ${new Date().toLocaleString('de-DE')}`, M.left, ph - 18);
    doc.text(`Seite ${ctx.page}`, pw - M.right, ph - 18, { align: 'right' });
  };

  const newPage = () => {
    drawFooter();
    doc.addPage();
    ctx.page += 1;
    ctx.y = M.top;
    drawHeader();
  };

  const ensure = (h: number) => {
    if (ctx.y + h > ph - M.bottom) newPage();
  };

  const text = (
    str: string,
    opts: { size?: number; bold?: boolean; color?: readonly number[]; lineGap?: number; x?: number; maxWidth?: number } = {},
  ) => {
    const { size = 10, bold = false, color = COLORS.text, lineGap = 3, x = M.left, maxWidth = contentW } = opts;
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    setColor(color, 'text');
    const cleaned = clean(str);
    if (!cleaned) return;
    const lines = doc.splitTextToSize(cleaned, maxWidth);
    const lh = size * 1.25;
    for (const line of lines) {
      ensure(lh + lineGap);
      doc.text(line, x, ctx.y + lh - 2);
      ctx.y += lh + lineGap;
    }
  };

  const sectionTitle = (label: string) => {
    ctx.sectionLabel = clean(label);
    newPage();
    setColor(COLORS.primary, 'fill');
    doc.rect(M.left, ctx.y, 4, 28, 'F');
    setColor(COLORS.text, 'text');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text(clean(label), M.left + 14, ctx.y + 20);
    ctx.y += 38;
  };

  const h2 = (label: string) => {
    ctx.y += 6;
    ensure(28);
    setColor(COLORS.primaryDark, 'text');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(clean(label), M.left, ctx.y + 12);
    ctx.y += 16;
    setColor(COLORS.primary, 'draw');
    doc.setLineWidth(0.8);
    doc.line(M.left, ctx.y, M.left + 32, ctx.y);
    ctx.y += 8;
  };

  const h3 = (label: string) => {
    ctx.y += 4;
    ensure(18);
    setColor(COLORS.text, 'text');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(clean(label), M.left, ctx.y + 10);
    ctx.y += 14;
  };

  const paragraph = (str: string) => {
    const c = clean(str);
    if (!c) return;
    text(c, { size: 10, color: COLORS.text, lineGap: 3 });
  };

  const muted = (str: string) => {
    const c = clean(str);
    if (!c) return;
    text(c, { size: 9, color: COLORS.muted, lineGap: 2 });
  };

  const bullet = (str: string) => {
    const c = clean(str);
    if (!c) return;
    const indent = 14;
    const bulletX = M.left + 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    setColor(COLORS.primary, 'text');
    const lines = doc.splitTextToSize(c, contentW - indent);
    const lh = 10 * 1.3;
    ensure(lh + 3);
    doc.text('-', bulletX, ctx.y + lh - 2);
    setColor(COLORS.text, 'text');
    for (let i = 0; i < lines.length; i++) {
      if (i > 0) ensure(lh + 2);
      doc.text(lines[i], M.left + indent, ctx.y + lh - 2);
      ctx.y += lh + (i === lines.length - 1 ? 3 : 1);
    }
  };

  const badge = (label: string, x: number, y: number, color: readonly number[]): number => {
    const c = clean(label);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const w = doc.getTextWidth(c) + 12;
    setColor(color, 'fill');
    doc.roundedRect(x, y - 9, w, 13, 3, 3, 'F');
    setColor(COLORS.white, 'text');
    doc.text(c, x + 6, y);
    return w;
  };

  // Card: light bg block + border
  const card = (renderInside: () => void, opts: { padding?: number } = {}) => {
    const padding = opts.padding ?? 12;
    const startY = ctx.y;
    // We'll first measure by rendering to a temp Y, then redraw with bg.
    // Simpler: draw bg later — record start, render content, then draw bg behind by re-positioning.
    // jsPDF doesn't support that easily; instead pre-allocate by rendering normally and we draw a left accent line.
    setColor(COLORS.light, 'fill');
    setColor(COLORS.border, 'draw');
    doc.setLineWidth(0.5);
    // Approx: we draw the outer box AFTER content using saved coords by a simple buffer approach:
    const contentStart = startY;
    ctx.y += padding;
    renderInside();
    ctx.y += padding;
    const contentEnd = ctx.y;
    // Draw box behind by repainting? Not possible. Instead draw left accent + bottom rule.
    setColor(COLORS.primary, 'draw');
    doc.setLineWidth(2);
    doc.line(M.left, contentStart + 4, M.left, contentEnd - 4);
    setColor(COLORS.border, 'draw');
    doc.setLineWidth(0.4);
    doc.line(M.left + 6, contentEnd - 2, pw - M.right, contentEnd - 2);
    ctx.y += 8;
  };

  // Key-value row
  const kv = (k: string, v: string) => {
    const cv = clean(v);
    if (!cv) return;
    const lh = 10 * 1.3;
    ensure(lh + 4);
    setColor(COLORS.muted, 'text');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(clean(k), M.left + 6, ctx.y + lh - 2);
    setColor(COLORS.text, 'text');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    const valueX = M.left + 130;
    const valueW = contentW - 130 - 6;
    const lines = doc.splitTextToSize(cv, valueW);
    for (let i = 0; i < lines.length; i++) {
      if (i > 0) ensure(lh + 2);
      doc.text(lines[i], valueX, ctx.y + lh - 2);
      ctx.y += lh + (i === lines.length - 1 ? 4 : 1);
    }
  };

  // ============ COVER PAGE ============
  drawHeader();

  setColor(COLORS.muted, 'text');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('SOFTWARE INTAKE', M.left, ctx.y + 12);
  ctx.y += 28;

  setColor(COLORS.text, 'text');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  const titleLines = doc.splitTextToSize(clean(opts.intakeTitle), contentW);
  for (const line of titleLines) {
    ensure(32);
    doc.text(line, M.left, ctx.y + 22);
    ctx.y += 30;
  }

  if (opts.jpdKey) {
    setColor(COLORS.primary, 'text');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(clean(opts.jpdKey), M.left, ctx.y + 14);
    ctx.y += 22;
  }

  // Decorative accent line
  setColor(COLORS.primary, 'fill');
  doc.rect(M.left, ctx.y + 6, 60, 3, 'F');
  ctx.y += 24;

  // Meta block
  if (opts.intakeMeta) {
    h3('Übersicht');
    card(() => {
      kv('Status', opts.intakeMeta?.status?.replace(/_/g, ' ') || '—');
      if (opts.intakeMeta?.priority) kv('Priorität', opts.intakeMeta.priority);
      if (opts.intakeMeta?.valueStream) kv('Value Stream', opts.intakeMeta.valueStream);
      if (opts.intakeMeta?.category) kv('Kategorie', opts.intakeMeta.category);
      if (opts.intakeMeta?.createdAt) kv('Erstellt', new Date(opts.intakeMeta.createdAt).toLocaleString('de-DE'));
      if (opts.intakeMeta?.updatedAt) kv('Aktualisiert', new Date(opts.intakeMeta.updatedAt).toLocaleString('de-DE'));
    });
  }

  // Inhaltsverzeichnis
  h3('Inhalt');
  const toc: string[] = [];
  if (opts.sections.spec && opts.spec) toc.push('Spezifikation');
  if (opts.sections.routing && opts.routing) toc.push('Routing-Analyse');
  if (opts.sections.transcript && opts.transcript?.length) toc.push('Interview-Transkript');
  card(() => {
    toc.forEach((t, i) => {
      const lh = 14;
      ensure(lh + 2);
      setColor(COLORS.primary, 'text');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(String(i + 1).padStart(2, '0'), M.left + 6, ctx.y + lh - 2);
      setColor(COLORS.text, 'text');
      doc.setFont('helvetica', 'normal');
      doc.text(t, M.left + 30, ctx.y + lh - 2);
      ctx.y += lh + 2;
    });
  });

  // ============ SPEC ============
  if (opts.sections.spec && opts.spec) {
    const s = opts.spec;
    sectionTitle('Spezifikation');

    if (s.problemStatement) {
      h2('Problemstellung');
      paragraph(s.problemStatement);
    }
    if (s.currentProcess) {
      h3('Aktueller Prozess');
      paragraph(s.currentProcess);
    }
    if (Array.isArray(s.painPoints) && s.painPoints.length) {
      h3('Schmerzpunkte');
      s.painPoints.forEach((p: string) => bullet(p));
    }
    if (Array.isArray(s.goals) && s.goals.length) {
      h3('Ziele');
      s.goals.forEach((g: string) => bullet(g));
    }

    // Users
    if (Array.isArray(s.users) && s.users.length) {
      h2('Nutzer & Nutzung');
      s.users.forEach((u: any) => {
        const persona = typeof u === 'string' ? u : u.persona || '—';
        const meta = typeof u === 'string' ? '' : [u.count && `${u.count} Nutzer`, u.techLevel].filter(Boolean).join(' · ');
        const ctxStr = typeof u === 'string' ? '' : (u.context || '');
        bullet(`${persona}${meta ? ` (${meta})` : ''}${ctxStr ? ` — ${ctxStr}` : ''}`);
      });
      if (s.frequency || s.volumes) {
        ctx.y += 4;
        card(() => {
          if (s.frequency) kv('Häufigkeit', s.frequency);
          if (s.volumes) kv('Volumen', s.volumes);
        });
      }
    }

    // Data & Security
    if (s.dataClassification || s.retentionPeriod || s.dataTypes?.length || s.privacyRequirements?.length) {
      h2('Daten & Sicherheit');
      card(() => {
        if (s.dataClassification) kv('Klassifikation', String(s.dataClassification));
        if (s.retentionPeriod) kv('Aufbewahrung', String(s.retentionPeriod));
      });
      if (Array.isArray(s.dataTypes) && s.dataTypes.length) {
        h3('Datentypen');
        s.dataTypes.forEach((d: string) => bullet(d));
      }
      if (Array.isArray(s.privacyRequirements) && s.privacyRequirements.length) {
        h3('Datenschutz-Anforderungen');
        s.privacyRequirements.forEach((p: string) => bullet(p));
      }
    }

    // Integrations
    if (Array.isArray(s.integrations) && s.integrations.length) {
      h2('Integrationen');
      s.integrations.forEach((it: any) => {
        const meta = [it.type, it.priority].filter(Boolean).join(' · ');
        bullet(`${it.system || '—'}${meta ? ` (${meta})` : ''}${it.notes ? ` — ${it.notes}` : ''}`);
      });
    }

    // UX
    if (Array.isArray(s.uxNeeds) && s.uxNeeds.length) {
      h2('UX-Anforderungen');
      s.uxNeeds.forEach((u: any) => {
        bullet(`${u.type || '—'} (${u.priority || 'should'}) — ${u.description || ''}`);
      });
    }

    // NFRs
    if (s.nfrs && typeof s.nfrs === 'object') {
      h2('Nicht-funktionale Anforderungen');
      card(() => {
        if (s.nfrs.availability) kv('Verfügbarkeit', String(s.nfrs.availability));
        if (s.nfrs.responseTime) kv('Antwortzeit', String(s.nfrs.responseTime));
        if (s.nfrs.throughput) kv('Durchsatz', String(s.nfrs.throughput));
        if (s.nfrs.supportHours) kv('Support-Zeiten', String(s.nfrs.supportHours));
        if (s.nfrs.auditability !== undefined) kv('Audit-Pflicht', s.nfrs.auditability ? 'Ja' : 'Nein');
        // Any extra NFR fields
        Object.entries(s.nfrs).forEach(([k, v]) => {
          if (['availability', 'responseTime', 'throughput', 'supportHours', 'auditability'].includes(k)) return;
          if (v == null) return;
          kv(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
        });
      });
    }

    // Acceptance criteria
    if (Array.isArray(s.acceptanceCriteria) && s.acceptanceCriteria.length) {
      h2('Akzeptanzkriterien');
      muted('Generierte Testszenarien im Given-When-Then Format');
      ctx.y += 4;
      s.acceptanceCriteria.forEach((ac: any) => {
        ensure(60);
        // Card-like: ref badge + lines
        if (ac.storyRef) {
          badge(String(ac.storyRef), M.left, ctx.y + 8, COLORS.accent);
          ctx.y += 14;
        }
        if (ac.given) text(`Given  ${ac.given}`, { bold: false, size: 10 });
        if (ac.when) text(`When   ${ac.when}`, { bold: false, size: 10 });
        if (ac.then) text(`Then   ${ac.then}`, { bold: false, size: 10 });
        ctx.y += 6;
        setColor(COLORS.border, 'draw');
        doc.setLineWidth(0.3);
        doc.line(M.left, ctx.y, pw - M.right, ctx.y);
        ctx.y += 8;
      });
    }

    // Risks
    if (Array.isArray(s.risks) && s.risks.length) {
      h2('Risiken');
      s.risks.forEach((r: any) => {
        ensure(40);
        text(r.description || '—', { bold: true, size: 10.5 });
        const parts: string[] = [];
        if (r.probability) parts.push(`Wahrscheinlichkeit: ${r.probability}`);
        if (r.impact) parts.push(`Auswirkung: ${r.impact}`);
        if (parts.length) muted(parts.join('  ·  '));
        if (r.mitigation) {
          text('Maßnahme:', { bold: true, size: 9, color: COLORS.muted });
          paragraph(r.mitigation);
        }
        ctx.y += 4;
      });
    }

    // Assumptions
    if (Array.isArray(s.assumptions) && s.assumptions.length) {
      h2('Annahmen');
      s.assumptions.forEach((a: string) => bullet(a));
    }

    // Open Questions
    if (Array.isArray(s.openQuestions) && s.openQuestions.length) {
      h2('Offene Fragen');
      s.openQuestions.forEach((q: string) => bullet(q));
    }
  }

  // ============ ROUTING ============
  if (opts.sections.routing && opts.routing) {
    const r = opts.routing;
    sectionTitle('Routing-Analyse');

    h2('Empfehlung');
    card(() => {
      kv('Empfohlener Pfad', String(r.path));
      kv('Gesamt-Score', String(r.score));
    });

    if (r.score_json && typeof r.score_json === 'object') {
      h2('Score-Aufschlüsselung');
      const entries = Object.entries(r.score_json as Record<string, number>);
      entries.forEach(([k, v]) => {
        const lh = 14;
        ensure(lh + 12);
        // Label
        setColor(COLORS.text, 'text');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
        doc.text(label, M.left, ctx.y + lh - 2);
        // Value
        setColor(COLORS.primary, 'text');
        doc.text(String(v), pw - M.right, ctx.y + lh - 2, { align: 'right' });
        ctx.y += lh;
        // Bar
        const barH = 5;
        const pct = Math.max(0, Math.min(100, Number(v) || 0)) / 100;
        setColor(COLORS.border, 'fill');
        doc.roundedRect(M.left, ctx.y, contentW, barH, 2, 2, 'F');
        setColor(COLORS.primary, 'fill');
        doc.roundedRect(M.left, ctx.y, contentW * pct, barH, 2, 2, 'F');
        ctx.y += barH + 10;
      });
    }

    if (r.explanation_markdown) {
      h2('Erklärung');
      renderMarkdown(r.explanation_markdown, {
        text, h2: (l: string) => { h3(l); }, h3: (l: string) => { h3(l); }, bullet,
        kvRow: (cells: string[]) => {
          // Render markdown table row as kv pair / line
          const lh = 12;
          ensure(lh + 2);
          setColor(COLORS.text, 'text');
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9.5);
          doc.text(cells.join('   ·   '), M.left, ctx.y + lh - 2);
          ctx.y += lh + 2;
        },
      });
    }
  }

  // ============ TRANSCRIPT ============
  if (opts.sections.transcript && opts.transcript?.length) {
    sectionTitle('Interview-Transkript');
    muted(`Vollständiger Gesprächsverlauf · ${opts.transcript.length} Nachrichten`);
    ctx.y += 8;

    opts.transcript.forEach((msg) => {
      const isUser = msg.speaker === 'user';
      const speaker = isUser ? 'User' : (msg.speaker || 'System');
      const ts = new Date(msg.timestamp).toLocaleString('de-DE');
      const lh = 11 * 1.35;

      ensure(lh * 3 + 18);

      // Speaker badge
      const color = isUser ? COLORS.primary : COLORS.accent;
      badge(speaker.toUpperCase(), M.left, ctx.y + 8, color);
      // Timestamp
      setColor(COLORS.muted, 'text');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(ts, pw - M.right, ctx.y + 8, { align: 'right' });
      ctx.y += 14;

      // Message
      paragraph(msg.message);
      ctx.y += 4;
      setColor(COLORS.border, 'draw');
      doc.setLineWidth(0.3);
      doc.line(M.left, ctx.y, pw - M.right, ctx.y);
      ctx.y += 10;
    });
  }

  drawFooter();

  const safe = opts.intakeTitle.replace(/[^\w\-]+/g, '_').slice(0, 60) || 'intake';
  doc.save(`${safe}.pdf`);
}

// =====================================================================
// Minimal markdown renderer (headings, bullets, tables, paragraphs)
// =====================================================================
function renderMarkdown(
  md: string,
  api: {
    text: (s: string, opts?: any) => void;
    h2: (s: string) => void;
    h3: (s: string) => void;
    bullet: (s: string) => void;
    kvRow: (cells: string[]) => void;
  },
) {
  const lines = md.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) { i++; continue; }

    // Table block
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableRows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const row = lines[i].trim();
        // Skip separator rows like |----|----|
        if (!/^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/.test(row)) {
          const cells = row.split('|').map(c => c.trim()).filter((c, idx, arr) => !(idx === 0 && c === '') && !(idx === arr.length - 1 && c === ''));
          tableRows.push(cells);
        }
        i++;
      }
      tableRows.forEach((r, idx) => {
        if (idx === 0) api.h3(r.join(' · '));
        else api.kvRow(r);
      });
      continue;
    }

    // Heading
    const hMatch = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (hMatch) {
      const level = hMatch[1].length;
      const txt = stripInline(hMatch[2]);
      if (level <= 2) api.h2(txt);
      else api.h3(txt);
      i++; continue;
    }

    // Bullet
    if (/^[-*+]\s+/.test(trimmed)) {
      api.bullet(stripInline(trimmed.replace(/^[-*+]\s+/, '')));
      i++; continue;
    }

    // Paragraph (gather consecutive non-empty)
    const para: string[] = [trimmed];
    i++;
    while (i < lines.length && lines[i].trim() && !/^[-*+]\s+/.test(lines[i].trim()) && !/^#{1,6}\s+/.test(lines[i].trim()) && !lines[i].trim().startsWith('|')) {
      para.push(lines[i].trim());
      i++;
    }
    api.text(stripInline(para.join(' ')), { size: 10, lineGap: 3 });
  }
}

function stripInline(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}
