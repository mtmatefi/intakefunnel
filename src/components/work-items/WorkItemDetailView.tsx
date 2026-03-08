import { useState } from "react";
import type { WorkItemTree } from "@/hooks/useWorkItems";
import { useTranslateWorkItems, usePublishDeliveryPackage } from "@/hooks/useWorkItems";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ChevronDown, ChevronRight, ExternalLink, GitBranch,
  CheckCircle2, ListChecks, ShieldCheck, Gauge, Target, X,
  Languages, Loader2, Send,
} from "lucide-react";

const ITEM_TYPE_ICONS: Record<string, string> = { epic: "📦", feature: "✨", story: "📝" };
const ITEM_TYPE_LABELS: Record<string, string> = { epic: "Epic", feature: "Feature", story: "Story" };

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-destructive/20 text-destructive",
  medium: "bg-amber-500/20 text-amber-400",
  low: "bg-muted text-muted-foreground",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  todo: "bg-muted text-muted-foreground",
  "in progress": "bg-primary/20 text-primary",
  done: "bg-emerald-500/20 text-emerald-400",
};

function flattenTree(items: WorkItemTree[]): WorkItemTree[] {
  const result: WorkItemTree[] = [];
  function walk(nodes: WorkItemTree[]) {
    for (const n of nodes) {
      result.push(n);
      walk(n.children);
    }
  }
  walk(items);
  return result;
}

// ── Left: Tree list ──
function TreeNode({
  item,
  depth = 0,
  selectedId,
  onSelect,
}: {
  item: WorkItemTree;
  depth?: number;
  selectedId: string | null;
  onSelect: (item: WorkItemTree) => void;
}) {
  const [open, setOpen] = useState(item.item_type === "epic");
  const hasChildren = item.children.length > 0;
  const isSelected = selectedId === item.id;

  return (
    <div>
      <button
        className={cn(
          "w-full flex items-center gap-1.5 py-1.5 px-2 text-left text-sm rounded transition-colors",
          isSelected
            ? "bg-primary/15 text-primary font-medium"
            : "hover:bg-secondary/50 text-foreground",
        )}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        onClick={() => {
          onSelect(item);
          if (hasChildren) setOpen(!open);
        }}
      >
        {hasChildren ? (
          open ? <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <span className="text-xs shrink-0">{ITEM_TYPE_ICONS[item.item_type]}</span>
        <span className="flex-1 truncate text-xs">{item.title}</span>
        {item.story_points != null && (
          <span className="text-[10px] text-muted-foreground shrink-0">{item.story_points}SP</span>
        )}
      </button>
      {open && hasChildren && (
        <div>
          {item.children.map((child) => (
            <TreeNode key={child.id} item={child} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Right: Detail panel ──
function DetailPanel({ item, onTranslate, isTranslating }: { item: WorkItemTree; onTranslate?: () => void; isTranslating?: boolean }) {
  const hasAC = item.acceptance_criteria && item.acceptance_criteria.length > 0;
  const hasFR = item.functional_requirements && item.functional_requirements.length > 0;
  const hasNFR = item.non_functional_requirements && item.non_functional_requirements.length > 0;

  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-5">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg">{ITEM_TYPE_ICONS[item.item_type]}</span>
              <Badge variant="outline" className="text-xs">{ITEM_TYPE_LABELS[item.item_type]}</Badge>
              {item.priority && (
                <Badge variant="secondary" className={cn("text-xs", PRIORITY_COLORS[item.priority] || "")}>
                  {item.priority}
                </Badge>
              )}
              <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[item.status] || "")}>
                {item.status}
              </Badge>
              {item.story_points != null && (
                <Badge variant="outline" className="text-xs">
                  {item.story_points} Story Points
                </Badge>
              )}
            </div>
            {onTranslate && (
              <Button variant="outline" size="sm" className="gap-1.5 text-xs shrink-0" onClick={onTranslate} disabled={isTranslating}>
                {isTranslating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Languages className="h-3 w-3" />}
                EN
              </Button>
            )}
          </div>
          <h2 className="text-base font-semibold text-foreground leading-snug">{item.title}</h2>
          {item.jira_issue_key && (
            <a
              href={item.jira_issue_url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-mono text-primary hover:underline mt-1"
            >
              {item.jira_issue_key} <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        {/* Description */}
        {item.description && (
          <div>
            <h3 className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-1.5">
              <GitBranch className="h-3.5 w-3.5" /> Beschreibung
            </h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {item.description}
            </p>
          </div>
        )}

        <Separator />

        {/* Acceptance Criteria */}
        {hasAC && (
          <div>
            <h3 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Acceptance Criteria
            </h3>
            <ul className="space-y-1.5">
              {item.acceptance_criteria!.map((ac, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                  {ac}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Functional Requirements */}
        {hasFR && (
          <div>
            <h3 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
              <ListChecks className="h-3.5 w-3.5 text-primary" /> Funktionale Anforderungen
            </h3>
            <ul className="space-y-1.5">
              {item.functional_requirements!.map((fr, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  {fr}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Non-Functional Requirements */}
        {hasNFR && (
          <div>
            <h3 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-400" /> Nicht-funktionale Anforderungen
            </h3>
            <ul className="space-y-1.5">
              {item.non_functional_requirements!.map((nfr, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                  {nfr}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Definition of Done */}
        {item.definition_of_done && (
          <div>
            <h3 className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-primary" /> Definition of Done
            </h3>
            <p className="text-sm text-muted-foreground">{item.definition_of_done}</p>
          </div>
        )}

        {/* Children summary */}
        {item.children.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="text-sm font-medium text-foreground mb-2">
                Untergeordnete Items ({item.children.length})
              </h3>
              <div className="space-y-1">
                {item.children.map((child) => (
                  <div key={child.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="text-xs">{ITEM_TYPE_ICONS[child.item_type]}</span>
                    <span className="truncate">{child.title}</span>
                    {child.story_points != null && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1 ml-auto shrink-0">{child.story_points}SP</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Meta */}
        <Separator />
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Erstellt: {new Date(item.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}</p>
          {item.assignee && <p>Zugewiesen: {item.assignee}</p>}
          <p>Source: {item.source_app}</p>
        </div>
      </div>
    </ScrollArea>
  );
}

// ── Empty state ──
function EmptyDetail() {
  return (
    <div className="h-full flex items-center justify-center text-muted-foreground/50">
      <div className="text-center space-y-2">
        <GitBranch className="h-8 w-8 mx-auto" />
        <p className="text-sm">Wähle ein Work Item aus der Liste</p>
      </div>
    </div>
  );
}

// ── Stats bar ──
function StatsBar({ items }: { items: WorkItemTree[] }) {
  const flat = flattenTree(items);
  const epics = flat.filter((i) => i.item_type === "epic").length;
  const features = flat.filter((i) => i.item_type === "feature").length;
  const stories = flat.filter((i) => i.item_type === "story").length;
  const totalSP = flat.reduce((sum, i) => sum + (i.story_points || 0), 0);

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-border/50 text-xs text-muted-foreground bg-muted/20">
      <span>📦 {epics} Epics</span>
      <span>✨ {features} Features</span>
      <span>📝 {stories} Stories</span>
      {totalSP > 0 && <span className="ml-auto font-medium text-foreground">{totalSP} SP gesamt</span>}
    </div>
  );
}

// ── Main export ──
export function WorkItemDetailView({
  tree,
  innovationId,
  innovationTitle,
  onClose,
}: {
  tree: WorkItemTree[];
  innovationId: string;
  innovationTitle: string;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<WorkItemTree | null>(null);
  const translateMutation = useTranslateWorkItems();

  const allItemIds = flattenTree(tree).map((i) => i.id);

  const handleTranslateAll = async () => {
    try {
      const result = await translateMutation.mutateAsync({
        workItemIds: allItemIds,
        innovationId,
        targetLanguage: "en",
      });
      toast.success(`${result.translated_count} Items ins Englische übersetzt`);
    } catch (e: any) {
      toast.error(e?.message || "Übersetzung fehlgeschlagen");
    }
  };

  const handleTranslateOne = async (item: WorkItemTree) => {
    const ids = [item.id, ...flattenTree(item.children).map((c) => c.id)];
    try {
      const result = await translateMutation.mutateAsync({
        workItemIds: ids,
        innovationId,
        targetLanguage: "en",
      });
      toast.success(`${result.translated_count} Items übersetzt`);
    } catch (e: any) {
      toast.error(e?.message || "Übersetzung fehlgeschlagen");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-primary" />
          <h1 className="text-sm font-semibold">{innovationTitle} – Work Items</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            disabled={translateMutation.isPending || allItemIds.length === 0}
            onClick={handleTranslateAll}
          >
            {translateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Languages className="h-3.5 w-3.5" />}
            Alle übersetzen (EN)
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose} className="gap-1.5">
            <X className="h-4 w-4" /> Schließen
          </Button>
        </div>
      </div>

      <StatsBar items={tree} />

      {/* Split view */}
      <div className="flex flex-1 min-h-0">
        {/* Left: tree */}
        <div className="w-[340px] shrink-0 border-r border-border/50 bg-card/50">
          <ScrollArea className="h-full">
            <div className="py-1">
              {tree.map((item) => (
                <TreeNode key={item.id} item={item} selectedId={selected?.id || null} onSelect={setSelected} />
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Right: detail */}
        <div className="flex-1 min-w-0 bg-background">
          {selected ? (
            <DetailPanel
              item={selected}
              onTranslate={() => handleTranslateOne(selected)}
              isTranslating={translateMutation.isPending}
            />
          ) : (
            <EmptyDetail />
          )}
        </div>
      </div>
    </div>
  );
}
