import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Plus, Link2, RefreshCw, Trash2, Unlink, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";

const WorkspaceSelect = () => {
  const {
    workspaces, trashedWorkspaces, setWorkspace, createWorkspace,
    syncWorkspaceToSculptor, unlinkFromSculptor, moveToTrash,
    restoreFromTrash, permanentlyDelete, loading,
  } = useWorkspace();
  const [showCreate, setShowCreate] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [syncToSculptor, setSyncToSculptor] = useState(true);
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [unlinking, setUnlinking] = useState<string | null>(null);
  const [trashing, setTrashing] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const ws = await createWorkspace(name, description, syncToSculptor);
    setCreating(false);
    if (ws) {
      toast.success(syncToSculptor
        ? "Workspace erstellt & mit Strategy Sculptor synchronisiert!"
        : "Workspace erstellt!"
      );
      navigate("/dashboard");
    } else {
      toast.error("Fehler beim Erstellen");
    }
  };

  const handleSelect = (ws: typeof workspaces[0]) => {
    setWorkspace(ws);
    navigate("/dashboard");
  };

  const handleSync = async (wsId: string) => {
    setSyncing(wsId);
    const ok = await syncWorkspaceToSculptor(wsId);
    setSyncing(null);
    toast[ok ? "success" : "error"](ok ? "Workspace synchronisiert!" : "Sync fehlgeschlagen");
  };

  const handleUnlink = async (wsId: string) => {
    setUnlinking(wsId);
    const ok = await unlinkFromSculptor(wsId);
    setUnlinking(null);
    toast[ok ? "success" : "error"](ok ? "Verknüpfung entfernt" : "Fehler beim Entknüpfen");
  };

  const handleTrash = async (wsId: string) => {
    setTrashing(wsId);
    const ok = await moveToTrash(wsId);
    setTrashing(null);
    toast[ok ? "success" : "error"](ok ? "In den Papierkorb verschoben" : "Fehler");
  };

  const handleRestore = async (wsId: string) => {
    const ok = await restoreFromTrash(wsId);
    toast[ok ? "success" : "error"](ok ? "Wiederhergestellt!" : "Fehler");
  };

  const handlePermanentDelete = async (wsId: string) => {
    setDeleting(wsId);
    const ok = await permanentlyDelete(wsId);
    setDeleting(null);
    setDeleteConfirm(null);
    toast[ok ? "success" : "error"](ok ? "Endgültig gelöscht" : "Fehler beim Löschen");
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-8 shadow-lg">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary/50 bg-primary/5">
            <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="font-serif text-2xl text-foreground">Workspace wählen</h1>
          <p className="text-sm text-muted-foreground">Wähle einen Workspace oder erstelle einen neuen</p>
        </div>

        {/* Active Workspaces */}
        {workspaces.length > 0 && !showCreate && (
          <div className="space-y-3 mb-6">
            {workspaces.map((ws) => {
              const isLinked = !!(ws as any).external_workspace_id;
              return (
                <div key={ws.id} className="w-full rounded-lg border border-border bg-card overflow-hidden">
                  <button
                    onClick={() => handleSelect(ws)}
                    className="w-full p-4 text-left hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-foreground">{ws.name}</p>
                      <div className="flex items-center gap-2">
                        {isLinked ? (
                          <Badge variant="secondary" className="text-[10px] gap-1 bg-primary/10 text-primary border-primary/20">
                            <Link2 className="h-3 w-3" /> Strategy Sculptor
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
                            Nur Intake Router
                          </Badge>
                        )}
                        {(ws as any).status === "inactive" && (
                          <Badge variant="destructive" className="text-[10px]">Inaktiv</Badge>
                        )}
                      </div>
                    </div>
                    {ws.description && (
                      <p className="text-xs text-muted-foreground mt-1">{ws.description}</p>
                    )}
                  </button>
                  <div className="px-4 pb-3 border-t border-border/50 flex items-center gap-1 flex-wrap">
                    {/* Sync / Re-Sync */}
                    <Button
                      variant="ghost" size="sm"
                      className="text-xs text-muted-foreground hover:text-foreground mt-2 gap-1.5"
                      disabled={syncing === ws.id}
                      onClick={(e) => { e.stopPropagation(); handleSync(ws.id); }}
                    >
                      {syncing === ws.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                      {isLinked ? "Re-Sync" : "Mit Sculptor verknüpfen"}
                    </Button>

                    {/* Unlink */}
                    {isLinked && (
                      <Button
                        variant="ghost" size="sm"
                        className="text-xs text-muted-foreground hover:text-destructive mt-2 gap-1.5"
                        disabled={unlinking === ws.id}
                        onClick={(e) => { e.stopPropagation(); handleUnlink(ws.id); }}
                      >
                        {unlinking === ws.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlink className="h-3 w-3" />}
                        Entknüpfen
                      </Button>
                    )}

                    {/* Trash */}
                    <Button
                      variant="ghost" size="sm"
                      className="text-xs text-muted-foreground hover:text-destructive mt-2 gap-1.5 ml-auto"
                      disabled={trashing === ws.id}
                      onClick={(e) => { e.stopPropagation(); handleTrash(ws.id); }}
                    >
                      {trashing === ws.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      Papierkorb
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create form */}
        {showCreate ? (
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mein Unternehmen" required />
            </div>
            <div className="space-y-2">
              <Label>Beschreibung (optional)</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Kurze Beschreibung…" />
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border p-3 bg-secondary/20">
              <Checkbox
                id="sync-sculptor"
                checked={syncToSculptor}
                onCheckedChange={(v) => setSyncToSculptor(!!v)}
              />
              <div>
                <label htmlFor="sync-sculptor" className="text-sm font-medium text-foreground cursor-pointer">
                  Auch in Strategy Sculptor anlegen
                </label>
                <p className="text-xs text-muted-foreground">
                  Verknüpft automatisch Workspace, Mitglieder & Initiativen
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={creating}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Erstellen
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Abbrechen</Button>
            </div>
          </form>
        ) : (
          <div className="flex gap-2">
            <Button onClick={() => setShowCreate(true)} className="flex-1">
              <Plus className="mr-2 h-4 w-4" /> Neuen Workspace erstellen
            </Button>
            {trashedWorkspaces.length > 0 && (
              <Button variant="outline" onClick={() => setShowTrash(!showTrash)} className="gap-1.5">
                <Trash2 className="h-4 w-4" />
                <span className="text-xs">{trashedWorkspaces.length}</span>
              </Button>
            )}
          </div>
        )}

        {/* Trash section */}
        {showTrash && trashedWorkspaces.length > 0 && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground">Papierkorb</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowTrash(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
            {trashedWorkspaces.map((ws) => (
              <div key={ws.id} className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{ws.name}</p>
                    {ws.deleted_at && (
                      <p className="text-[10px] text-muted-foreground">
                        Gelöscht am {new Date(ws.deleted_at).toLocaleDateString("de-DE")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost" size="sm"
                      className="text-xs gap-1 hover:text-primary"
                      onClick={() => handleRestore(ws.id)}
                    >
                      <RotateCcw className="h-3 w-3" /> Wiederherstellen
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      className="text-xs gap-1 hover:text-destructive"
                      onClick={() => setDeleteConfirm(ws.id)}
                      disabled={deleting === ws.id}
                    >
                      {deleting === ws.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      Endgültig löschen
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Permanent delete confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Workspace endgültig löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dieser Vorgang kann nicht rückgängig gemacht werden. Alle Daten dieses Workspaces werden unwiderruflich gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirm && handlePermanentDelete(deleteConfirm)}
            >
              Endgültig löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WorkspaceSelect;
