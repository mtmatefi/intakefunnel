import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

const WorkspaceSelect = () => {
  const { workspaces, setWorkspace, createWorkspace, loading } = useWorkspace();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const ws = await createWorkspace(name, description);
    setCreating(false);
    if (ws) {
      toast.success("Workspace erstellt!");
      navigate("/dashboard");
    } else {
      toast.error("Fehler beim Erstellen");
    }
  };

  const handleSelect = (ws: typeof workspaces[0]) => {
    setWorkspace(ws);
    navigate("/dashboard");
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

        {workspaces.length > 0 && !showCreate && (
          <div className="space-y-3 mb-6">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => handleSelect(ws)}
                className="w-full rounded-lg border border-border bg-card p-4 text-left hover:border-primary/50 transition-colors"
              >
                <p className="font-medium text-foreground">{ws.name}</p>
                {ws.description && (
                  <p className="text-xs text-muted-foreground mt-1">{ws.description}</p>
                )}
              </button>
            ))}
          </div>
        )}

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
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={creating}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Erstellen
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Abbrechen</Button>
            </div>
          </form>
        ) : (
          <Button onClick={() => setShowCreate(true)} className="w-full">
            <Plus className="mr-2 h-4 w-4" /> Neuen Workspace erstellen
          </Button>
        )}
      </div>
    </div>
  );
};

export default WorkspaceSelect;
