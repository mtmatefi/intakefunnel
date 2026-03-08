import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useInnovations, useInnovationFeedback, useAddInnovationFeedback, useFetchInnovationsFromSculptor } from "@/hooks/useInnovations";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Lightbulb,
  FlaskConical,
  Rocket,
  CheckCircle2,
  XCircle,
  TrendingUp,
  ShieldAlert,
  Target,
  MessageSquarePlus,
  PlusCircle,
  Clock,
  User,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import type { SyncedInnovation } from "@/hooks/useInnovations";

const stageConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  ideation: { label: "Ideation", icon: Lightbulb, color: "bg-primary/10 text-primary border-primary/20" },
  validation: { label: "Validierung", icon: FlaskConical, color: "bg-accent/10 text-accent border-accent/20" },
  pilot: { label: "Pilot", icon: Rocket, color: "bg-warning/10 text-warning border-warning/20" },
  scaling: { label: "Skalierung", icon: TrendingUp, color: "bg-success/10 text-success border-success/20" },
  completed: { label: "Abgeschlossen", icon: CheckCircle2, color: "bg-muted text-muted-foreground border-border" },
  archived: { label: "Archiviert", icon: XCircle, color: "bg-muted text-muted-foreground border-border" },
};

const statusColors: Record<string, string> = {
  green: "bg-success/20 text-success",
  yellow: "bg-warning/20 text-warning",
  red: "bg-destructive/20 text-destructive",
};

function InnovationCard({ innovation, onClick }: { innovation: SyncedInnovation; onClick: () => void }) {
  const stage = stageConfig[innovation.stage] || stageConfig.ideation;
  const StageIcon = stage.icon;

  return (
    <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={onClick}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{innovation.title}</CardTitle>
            {innovation.product_name && (
              <CardDescription className="mt-1">{innovation.product_name}</CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {innovation.status && (
              <div className={`h-2.5 w-2.5 rounded-full ${statusColors[innovation.status] || "bg-muted"}`} />
            )}
            <Badge variant="outline" className={`text-[10px] gap-1 ${stage.color}`}>
              <StageIcon className="h-3 w-3" />
              {stage.label}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {innovation.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{innovation.description}</p>
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {innovation.responsible && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" /> {innovation.responsible}
            </span>
          )}
          {innovation.target_date && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {new Date(innovation.target_date).toLocaleDateString("de-DE")}
            </span>
          )}
          {(innovation.impact_data?.length || 0) > 0 && (
            <span className="flex items-center gap-1">
              <Target className="h-3 w-3" /> {innovation.impact_data.length} Impacts
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function InnovationDetailDialog({
  innovation,
  open,
  onClose,
}: {
  innovation: SyncedInnovation | null;
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { data: feedback = [] } = useInnovationFeedback(innovation?.id);
  const addFeedback = useAddInnovationFeedback();
  const [comment, setComment] = useState("");

  if (!innovation) return null;

  const stage = stageConfig[innovation.stage] || stageConfig.ideation;
  const StageIcon = stage.icon;

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
        },
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-[10px] gap-1 ${stage.color}`}>
              <StageIcon className="h-3 w-3" />
              {stage.label}
            </Badge>
            {innovation.status && (
              <Badge variant="outline" className={statusColors[innovation.status]}>
                {innovation.status === "green" ? "Auf Kurs" : innovation.status === "yellow" ? "Achtung" : "Kritisch"}
              </Badge>
            )}
          </div>
          <DialogTitle className="text-xl">{innovation.title}</DialogTitle>
          {innovation.product_name && (
            <DialogDescription>Produkt: {innovation.product_name}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {/* Key Fields */}
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

          {/* Impact Scores */}
          {innovation.impact_data?.length > 0 && (
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
          {innovation.trend_data?.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-accent" /> Verknüpfte Trends
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {innovation.trend_data.map((trend: any, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {trend.title || trend.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Risks */}
          {innovation.risk_data?.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-destructive" /> Verknüpfte Risiken
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {innovation.risk_data.map((risk: any, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs border-destructive/20 text-destructive">
                    {risk.title || risk.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Actions */}
          <Button onClick={handleCreateIntake} className="w-full gap-2">
            <PlusCircle className="h-4 w-4" />
            Intake aus dieser Innovation erstellen
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Button>

          <Separator />

          {/* Feedback Section */}
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-1.5">
              <MessageSquarePlus className="h-4 w-4" /> Feedback & Kommentare
            </h4>

            {feedback.length > 0 && (
              <div className="space-y-2 mb-3">
                {feedback.map((fb) => (
                  <div key={fb.id} className="p-3 rounded-lg bg-secondary/50 text-sm">
                    <p>{fb.comment}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(fb.created_at).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Textarea
                placeholder="Ihr Feedback zur Innovation..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-[60px]"
              />
              <Button
                size="sm"
                onClick={handleAddFeedback}
                disabled={!comment.trim() || addFeedback.isPending}
                className="self-end"
              >
                Senden
              </Button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground text-right">
            Zuletzt synchronisiert: {new Date(innovation.synced_at).toLocaleDateString("de-DE", {
              day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function InnovationsPage() {
  const { workspace } = useWorkspace();
  const { data: innovations = [], isLoading } = useInnovations(workspace?.id);
  const [selectedInnovation, setSelectedInnovation] = useState<SyncedInnovation | null>(null);
  const [stageFilter, setStageFilter] = useState<string | null>(null);

  const stages = Object.entries(stageConfig);
  const filtered = stageFilter
    ? innovations.filter((i) => i.stage === stageFilter)
    : innovations;

  const stageCounts = innovations.reduce((acc, i) => {
    acc[i.stage] = (acc[i.stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-bold">Innovationen</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Innovations-Pipeline aus dem Strategy Sculptor – read-only mit Feedback-Möglichkeit
          </p>
        </div>

        {/* Stage Filter */}
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={stageFilter === null ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setStageFilter(null)}
          >
            Alle ({innovations.length})
          </Badge>
          {stages.map(([key, config]) => {
            const count = stageCounts[key] || 0;
            if (count === 0) return null;
            const Icon = config.icon;
            return (
              <Badge
                key={key}
                variant={stageFilter === key ? "default" : "outline"}
                className={`cursor-pointer gap-1 ${stageFilter !== key ? config.color : ""}`}
                onClick={() => setStageFilter(stageFilter === key ? null : key)}
              >
                <Icon className="h-3 w-3" />
                {config.label} ({count})
              </Badge>
            );
          })}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader><div className="h-4 bg-muted rounded w-3/4" /></CardHeader>
                <CardContent><div className="h-3 bg-muted rounded w-full" /></CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">
                {innovations.length === 0
                  ? "Noch keine Innovationen synchronisiert. Die Daten werden automatisch vom Strategy Sculptor gepusht."
                  : "Keine Innovationen für diesen Filter gefunden."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((innovation) => (
              <InnovationCard
                key={innovation.id}
                innovation={innovation}
                onClick={() => setSelectedInnovation(innovation)}
              />
            ))}
          </div>
        )}

        <InnovationDetailDialog
          innovation={selectedInnovation}
          open={!!selectedInnovation}
          onClose={() => setSelectedInnovation(null)}
        />
      </div>
    </AppLayout>
  );
}
