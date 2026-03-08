import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useInnovations, useInnovationFeedback, useAddInnovationFeedback, useFetchInnovationsFromSculptor } from "@/hooks/useInnovations";
import { useWorkItemTree, useExportWorkItemsToJira } from "@/hooks/useWorkItems";
import type { WorkItemTree } from "@/hooks/useWorkItems";
import { useUnreadFeedback } from "@/hooks/useUnreadFeedback";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Lightbulb, FlaskConical, Rocket, CheckCircle2,
  TrendingUp, ShieldAlert, Target, MessageSquarePlus, PlusCircle,
  Clock, User, ArrowRight, RefreshCw, Search, LayoutGrid, List,
} from "lucide-react";
import type { SyncedInnovation } from "@/hooks/useInnovations";

// ── Stage pipeline (matches Strategy Sculptor's innovation_stage enum exactly) ──
const STAGES = ["discover", "explore", "prototype", "validate", "implement"] as const;

const STAGE_ICONS: Record<string, string> = {
  discover: "🔍", explore: "🧭", prototype: "🛠️", validate: "🧪", implement: "🚀",
};

const STAGE_LABELS: Record<string, string> = {
  discover: "Entdecken", explore: "Erforschen", prototype: "Prototyp",
  validate: "Validieren", implement: "Umsetzen",
};

const STAGE_DESCRIPTIONS: Record<string, string> = {
  discover: "Ideen & Probleme entdecken",
  explore: "Lösungsräume erforschen",
  prototype: "Erste Prototypen bauen",
  validate: "Hypothesen validieren",
  implement: "In Produkt umsetzen",
};

const STAGE_COLORS: Record<string, string> = {
  discover: "bg-purple-500/20 text-purple-400",
  explore: "bg-cyan-500/20 text-cyan-400",
  prototype: "bg-amber-500/20 text-amber-400",
  validate: "bg-blue-500/20 text-blue-400",
  implement: "bg-emerald-500/20 text-emerald-400",
};

const STATUS_DOT: Record<string, string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
};

// ── Innovation Card ──
function InnovationCard({ innovation, onClick, unreadCount, isNew }: { innovation: SyncedInnovation; onClick: () => void; unreadCount: number; isNew: boolean }) {
  const daysAge = Math.floor((Date.now() - new Date(innovation.updated_at).getTime()) / 86_400_000);
  const isImplement = innovation.stage === "implement";

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative rounded-lg border bg-card/40 hover:bg-card/70 p-2.5 cursor-pointer transition-all",
        isImplement ? "border-emerald-500/30 hover:border-emerald-500/50" : "border-border/50 hover:border-primary/30"
      )}
    >
      {isNew && (
        <span className="absolute -top-1.5 -left-1.5 flex h-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[8px] font-bold px-1.5 z-10">
          NEU
        </span>
      )}
      {unreadCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold px-1 z-10">
          {unreadCount}
        </span>
      )}
      <div className="flex items-center gap-2">
        <div className={cn("h-2 w-2 rounded-full shrink-0", STATUS_DOT[innovation.status ?? "yellow"] || "bg-muted")} />
        <h4 className="text-xs font-medium text-foreground leading-tight line-clamp-1 flex-1">{innovation.title}</h4>
      </div>
      <div className="flex items-center justify-between mt-1.5 pl-4">
        {innovation.responsible ? (
          <span className="text-[10px] text-muted-foreground truncate max-w-[60%]">{innovation.responsible}</span>
        ) : (
          <span className="text-[10px] text-muted-foreground/40 italic">Kein Owner</span>
        )}
        <div className="flex items-center gap-1.5">
          {isImplement && (
            <Badge variant="outline" className="text-[8px] h-3.5 border-emerald-500/30 text-emerald-400 px-1">
              Intake bereit
            </Badge>
          )}
          <span className="text-[9px] text-muted-foreground/60 shrink-0">{daysAge}d</span>
        </div>
      </div>
    </div>
  );
}

// ── Detail Sheet ──
function InnovationDetailSheet({
  innovation,
  open,
  onClose,
  onMarkRead,
}: {
  innovation: SyncedInnovation | null;
  open: boolean;
  onClose: () => void;
  onMarkRead?: (id: string) => void;
}) {
  const navigate = useNavigate();
  const { data: feedback = [] } = useInnovationFeedback(innovation?.id);
  const addFeedback = useAddInnovationFeedback();
  const [comment, setComment] = useState("");

  // Mark as read when sheet opens
  useEffect(() => {
    if (open && innovation?.id && onMarkRead) {
      onMarkRead(innovation.id);
    }
  }, [open, innovation?.id]);

  if (!innovation) return null;

  if (!innovation) return null;

  const isImplement = innovation.stage === "implement";

  const handleAddFeedback = async () => {
    if (!comment.trim()) return;
    try {
      await addFeedback.mutateAsync({ innovationId: innovation.id, comment: comment.trim() });
      setComment("");
      toast.success("Feedback gesendet");
    } catch {
      toast.error("Fehler beim Senden des Feedbacks");
    }
  };

  const handleCreateIntake = () => {
    onClose();
    navigate("/intake/new", {
      state: {
        fromInnovation: {
          id: innovation.id,
          externalId: innovation.external_id,
          title: innovation.title,
          description: innovation.description,
          hypothesis: innovation.hypothesis,
          valueProposition: innovation.value_proposition,
          expectedOutcome: innovation.expected_outcome,
          effortEstimate: innovation.effort_estimate,
          responsible: innovation.responsible,
          learnings: innovation.learnings,
          targetDate: innovation.target_date,
          impactData: innovation.impact_data,
          riskData: innovation.risk_data,
          trendData: innovation.trend_data,
        },
      },
    });
  };

  const stageIdx = STAGES.indexOf(innovation.stage as typeof STAGES[number]);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="sm:max-w-xl w-full overflow-y-auto" side="right">
        <SheetHeader className="pb-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className={cn("h-3 w-3 rounded-full", STATUS_DOT[innovation.status ?? "yellow"] || "bg-muted")} />
            <SheetTitle className="flex-1 text-left">{innovation.title}</SheetTitle>
          </div>
          {/* Stage progression bar */}
          <div className="flex items-center gap-1 mt-3">
            {STAGES.map((stage, idx) => {
              const isCurrent = stage === innovation.stage;
              const isPast = idx < stageIdx;
              return (
                <div key={stage} className="flex items-center gap-1 flex-1">
                  <div
                    className={cn(
                      "flex-1 rounded-md py-1.5 px-1 text-center text-[10px] font-medium transition-all border",
                      isCurrent ? "bg-primary/20 text-primary border-primary/40 shadow-sm" :
                      isPast ? "bg-primary/5 text-primary/60 border-primary/15" :
                      "bg-muted/30 text-muted-foreground border-border/30"
                    )}
                  >
                    {STAGE_ICONS[stage]} {STAGE_LABELS[stage]}
                  </div>
                  {idx < STAGES.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />}
                </div>
              );
            })}
          </div>
          {innovation.product_name && (
            <p className="text-xs text-muted-foreground mt-2">Produkt: {innovation.product_name}</p>
          )}
        </SheetHeader>

        <div className="space-y-4 mt-4">
          {innovation.description && (
            <div>
              <h4 className="text-sm font-medium mb-1">Beschreibung</h4>
              <p className="text-sm text-muted-foreground">{innovation.description}</p>
            </div>
          )}
          {innovation.hypothesis && (
            <div>
              <h4 className="text-sm font-medium mb-1">Hypothese</h4>
              <p className="text-sm text-muted-foreground">{innovation.hypothesis}</p>
            </div>
          )}
          {innovation.value_proposition && (
            <div>
              <h4 className="text-sm font-medium mb-1">Value Proposition</h4>
              <p className="text-sm text-muted-foreground">{innovation.value_proposition}</p>
            </div>
          )}
          {innovation.expected_outcome && (
            <div>
              <h4 className="text-sm font-medium mb-1">Erwartetes Ergebnis</h4>
              <p className="text-sm text-muted-foreground">{innovation.expected_outcome}</p>
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {innovation.responsible && <span className="flex items-center gap-1"><User className="h-3 w-3" /> {innovation.responsible}</span>}
            {innovation.effort_estimate && <span>Aufwand: {innovation.effort_estimate}</span>}
            {innovation.target_date && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(innovation.target_date).toLocaleDateString("de-DE")}</span>}
          </div>

          {/* Impact Scores */}
          {(innovation.impact_data?.length ?? 0) > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                  <Target className="h-4 w-4 text-primary" /> Impact Scores
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {innovation.impact_data.map((impact: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50 text-sm">
                      <span className="truncate">{impact.title || impact.name}</span>
                      {impact.contribution_score != null && (
                        <Badge variant="secondary" className="ml-2 shrink-0">
                          {impact.contribution_score}/10
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Trends */}
          {(innovation.trend_data?.length ?? 0) > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-accent-foreground" /> Verknüpfte Trends
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {innovation.trend_data.map((trend: any, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs">{trend.title || trend.name}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Risks */}
          {(innovation.risk_data?.length ?? 0) > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-destructive" /> Verknüpfte Risiken
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {innovation.risk_data.map((risk: any, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs border-destructive/20 text-destructive">{risk.title || risk.name}</Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Intake Button – only for implement stage */}
          {isImplement ? (
            <Button onClick={handleCreateIntake} className="w-full gap-2">
              <PlusCircle className="h-4 w-4" />
              Intake aus dieser Innovation erstellen
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
          ) : (
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3 text-center">
              <p className="text-sm text-muted-foreground">
                Intake-Erstellung verfügbar ab Stage <span className="font-medium text-emerald-400">"Umsetzen"</span>
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Aktuell: {STAGE_ICONS[innovation.stage]} {STAGE_LABELS[innovation.stage] || innovation.stage}
              </p>
            </div>
          )}

          <Separator />

          {/* Feedback Section */}
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-1.5">
              <MessageSquarePlus className="h-4 w-4" /> Feedback & Kommentare
            </h4>
            {feedback.length > 0 && (
              <div className="space-y-2 mb-3">
                {feedback.map((fb: any) => {
                  const isExternal = fb.source_app && fb.source_app !== 'intake_funnel';
                  return (
                    <div key={fb.id} className={cn(
                      "p-3 rounded-lg text-sm",
                      isExternal ? "bg-primary/5 border border-primary/20" : "bg-secondary/50"
                    )}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                          <User className="h-3 w-3" />
                          {fb.author_display_name || fb.author_name || 'Unbekannt'}
                        </span>
                        {isExternal && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1.5">Sculptor</Badge>
                        )}
                      </div>
                      <p>{fb.comment}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(fb.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex gap-2">
              <Textarea placeholder="Ihr Feedback zur Innovation..." value={comment} onChange={(e) => setComment(e.target.value)} className="min-h-[60px]" />
              <Button size="sm" onClick={handleAddFeedback} disabled={!comment.trim() || addFeedback.isPending} className="self-end">Senden</Button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground text-right">
            Zuletzt synchronisiert: {new Date(innovation.synced_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function InnovationsPage() {
  const { workspace } = useWorkspace();
  const { data: innovations = [], isLoading, refetch } = useInnovations(workspace?.id);
  const fetchFromSculptor = useFetchInnovationsFromSculptor();
  const { getUnreadForInnovation, isNewInnovation, markAsRead } = useUnreadFeedback();
  const [selectedInnovation, setSelectedInnovation] = useState<SyncedInnovation | null>(null);
  const [filterStage, setFilterStage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"board" | "list">("board");

  // Auto-fetch from Sculptor on page load (graceful – won't error if endpoint missing)
  useEffect(() => {
    if (workspace?.id && (workspace as any).external_workspace_id) {
      fetchFromSculptor.mutate(workspace.id, { onSuccess: () => refetch() });
    }
  }, [workspace?.id]);

  const filtered = useMemo(() => {
    let items = innovations;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((i) => i.title.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q));
    }
    if (filterStage) items = items.filter((i) => i.stage === filterStage);
    return items;
  }, [innovations, searchQuery, filterStage]);

  const byStage = useMemo(() => {
    const map: Record<string, SyncedInnovation[]> = {};
    for (const s of STAGES) map[s] = [];
    for (const inn of filtered) (map[inn.stage] ??= []).push(inn);
    return map;
  }, [filtered]);

  const stageCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of STAGES) map[s] = innovations.filter((i) => i.stage === s).length;
    return map;
  }, [innovations]);

  const implementCount = stageCounts["implement"] ?? 0;

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-4 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl text-foreground flex items-center gap-2">
              <Lightbulb className="h-6 w-6 text-primary" />
              Innovation Pipeline
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Aus dem Strategy Sculptor – {innovations.length} Innovation{innovations.length !== 1 ? "en" : ""} in der Pipeline
              {implementCount > 0 && (
                <span className="ml-2 text-emerald-400 font-medium">
                  · {implementCount} bereit für Intake
                </span>
              )}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={fetchFromSculptor.isPending}
            onClick={() => {
              if (workspace?.id) {
                fetchFromSculptor.mutate(workspace.id, { onSuccess: () => refetch() });
              }
            }}
          >
            <RefreshCw className={cn("h-4 w-4", fetchFromSculptor.isPending && "animate-spin")} />
            {fetchFromSculptor.isPending ? "Synchronisiere..." : "Aktualisieren"}
          </Button>
        </div>

        {/* ── Stage Pipeline Header ── */}
        <div className="relative">
          <div className="grid grid-cols-5 gap-1">
            {STAGES.map((stage, idx) => {
              const count = stageCounts[stage] ?? 0;
              const isActive = filterStage === stage;
              const isImplementStage = stage === "implement";
              return (
                <button
                  key={stage}
                  onClick={() => setFilterStage(isActive ? null : stage)}
                  className={cn(
                    "relative flex flex-col items-center gap-1 rounded-lg py-3 px-2 transition-all text-center",
                    isActive
                      ? "bg-primary/15 border border-primary/40 shadow-sm"
                      : isImplementStage && count > 0
                      ? "bg-emerald-500/5 border border-emerald-500/30 hover:bg-emerald-500/10"
                      : "bg-card/40 border border-border/40 hover:bg-card/60 hover:border-border/60"
                  )}
                >
                  <span className="text-lg">{STAGE_ICONS[stage]}</span>
                  <span className={cn("text-xs font-medium", isActive ? "text-primary" : isImplementStage && count > 0 ? "text-emerald-400" : "text-foreground")}>{STAGE_LABELS[stage]}</span>
                  <span className={cn(
                    "text-[10px] leading-none hidden md:block",
                    isActive ? "text-primary/70" : "text-muted-foreground"
                  )}>{STAGE_DESCRIPTIONS[stage]}</span>
                  <span className={cn(
                    "mt-1 inline-flex items-center justify-center h-5 min-w-5 rounded-full text-[10px] font-bold",
                    count > 0
                      ? isActive ? "bg-primary text-primary-foreground" : isImplementStage ? "bg-emerald-500 text-white" : "bg-muted text-foreground"
                      : "bg-muted/50 text-muted-foreground"
                  )}>{count}</span>
                  {idx < STAGES.length - 1 && (
                    <ArrowRight className="absolute -right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 hidden md:block z-10" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Innovation suchen..."
              className="pl-8 h-8 text-sm"
            />
          </div>
          {filterStage && (
            <Button variant="ghost" size="sm" onClick={() => setFilterStage(null)} className="h-8 text-xs gap-1">
              Filter zurücksetzen
            </Button>
          )}
          <div className="ml-auto flex items-center gap-1 bg-muted/30 rounded-md p-0.5">
            <button
              onClick={() => setViewMode("board")}
              className={cn("p-1.5 rounded transition-colors", viewMode === "board" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn("p-1.5 rounded transition-colors", viewMode === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* ── Content ── */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : innovations.length === 0 ? (
          <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border/60 bg-card/20">
            <div className="text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Lightbulb className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Noch keine Innovationen synchronisiert</p>
                <p className="text-xs text-muted-foreground mt-1">Die Daten werden automatisch vom Strategy Sculptor geladen</p>
              </div>
            </div>
          </div>
        ) : viewMode === "board" ? (
          /* ── BOARD VIEW (Kanban) ── */
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 min-h-[400px]">
            {STAGES.filter((s) => !filterStage || s === filterStage).map((stage) => (
              <div key={stage} className="flex flex-col min-h-0">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", STAGE_COLORS[stage])}>
                    {STAGE_ICONS[stage]} {STAGE_LABELS[stage]}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{(byStage[stage] ?? []).length}</span>
                </div>
                <div className={cn(
                  "flex-1 space-y-2 min-h-[100px] rounded-lg border p-2",
                  stage === "implement" ? "bg-emerald-500/5 border-emerald-500/20" : "bg-muted/10 border-border/30"
                )}>
                  {(byStage[stage] ?? []).length === 0 ? (
                    <div className="flex items-center justify-center h-20 text-muted-foreground/40">
                      <span className="text-xs">Keine Items</span>
                    </div>
                  ) : (
                    (byStage[stage] ?? []).map((inn) => (
                      <InnovationCard key={inn.id} innovation={inn} onClick={() => setSelectedInnovation(inn)} unreadCount={getUnreadForInnovation(inn.id)} isNew={isNewInnovation(inn.id)} />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ── LIST VIEW ── */
          <div className="space-y-1.5">
            {filtered.map((inn) => {
              const stageIdx = STAGES.indexOf(inn.stage as typeof STAGES[number]);
              const isImplement = inn.stage === "implement";
              return (
                <div
                  key={inn.id}
                  onClick={() => setSelectedInnovation(inn)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border bg-card/40 hover:bg-card/70 px-4 py-3 cursor-pointer transition-all group",
                    isImplement ? "border-emerald-500/30" : "border-border/50"
                  )}
                >
                  <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", STATUS_DOT[inn.status ?? "yellow"] || "bg-muted")} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{inn.title}</p>
                    {inn.value_proposition && <p className="text-[11px] text-muted-foreground truncate">{inn.value_proposition}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isImplement && (
                      <Badge variant="outline" className="text-[9px] h-4 border-emerald-500/30 text-emerald-400">Intake bereit</Badge>
                    )}
                    {(inn.trend_data?.length ?? 0) > 0 && (
                      <Badge variant="outline" className="text-[9px] h-4">{inn.trend_data.length} Trends</Badge>
                    )}
                    {(inn.risk_data?.length ?? 0) > 0 && (
                      <Badge variant="outline" className="text-[9px] h-4 border-destructive/20 text-destructive">{inn.risk_data.length} Risiken</Badge>
                    )}
                    {inn.product_name && (
                      <Badge variant="outline" className="text-[9px] h-4">{inn.product_name}</Badge>
                    )}
                  </div>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0", STAGE_COLORS[inn.stage])}>
                    {STAGE_LABELS[inn.stage] || inn.stage}
                  </span>
                  {/* Progress dots */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    {STAGES.map((s, i) => (
                      <div key={s} className={cn("h-1.5 w-1.5 rounded-full", i <= stageIdx ? "bg-primary" : "bg-muted-foreground/20")} />
                    ))}
                  </div>
                  {inn.responsible && <span className="text-[10px] text-muted-foreground shrink-0 hidden lg:block">{inn.responsible}</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* Detail Sheet */}
        <InnovationDetailSheet
          innovation={selectedInnovation}
          open={!!selectedInnovation}
          onClose={() => setSelectedInnovation(null)}
          onMarkRead={(id) => markAsRead.mutate(id)}
        />
      </div>
    </AppLayout>
  );
}
