import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

interface Workspace {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  external_workspace_id?: string | null;
  external_source?: string | null;
  status?: string;
  deleted_at?: string | null;
}

interface WorkspaceContextType {
  workspace: Workspace | null;
  workspaces: Workspace[];
  trashedWorkspaces: Workspace[];
  setWorkspace: (ws: Workspace) => void;
  loading: boolean;
  createWorkspace: (name: string, description?: string, syncToSculptor?: boolean) => Promise<Workspace | null>;
  syncWorkspaceToSculptor: (workspaceId: string) => Promise<boolean>;
  unlinkFromSculptor: (workspaceId: string) => Promise<boolean>;
  moveToTrash: (workspaceId: string) => Promise<boolean>;
  restoreFromTrash: (workspaceId: string) => Promise<boolean>;
  permanentlyDelete: (workspaceId: string) => Promise<boolean>;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspace: null,
  workspaces: [],
  trashedWorkspaces: [],
  setWorkspace: () => {},
  loading: true,
  createWorkspace: async () => null,
  syncWorkspaceToSculptor: async () => false,
  unlinkFromSculptor: async () => false,
  moveToTrash: async () => false,
  restoreFromTrash: async () => false,
  permanentlyDelete: async () => false,
  refreshWorkspaces: async () => {},
});

export const useWorkspace = () => useContext(WorkspaceContext);

const WS_STORAGE_KEY = "selected_workspace_id";

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workspace, setWorkspaceState] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [trashedWorkspaces, setTrashedWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWorkspaces = useCallback(async () => {
    if (!user) {
      setWorkspaces([]);
      setTrashedWorkspaces([]);
      setWorkspaceState(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from("workspaces")
      .select("*")
      .order("created_at", { ascending: false });

    const all = (data ?? []) as Workspace[];
    const active = all.filter((w) => (w.status ?? "active") !== "trashed");
    const trashed = all.filter((w) => w.status === "trashed");
    setWorkspaces(active);
    setTrashedWorkspaces(trashed);

    const savedId = localStorage.getItem(WS_STORAGE_KEY);
    const saved = active.find((w) => w.id === savedId);
    if (saved) {
      setWorkspaceState(saved);
    } else if (active.length > 0) {
      setWorkspaceState(active[0]);
      localStorage.setItem(WS_STORAGE_KEY, active[0].id);
    } else {
      setWorkspaceState(null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  const setWorkspace = useCallback((ws: Workspace) => {
    setWorkspaceState(ws);
    localStorage.setItem(WS_STORAGE_KEY, ws.id);
  }, []);

  const syncWorkspaceToSculptor = useCallback(async (workspaceId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke("sync-to-sculptor", {
        body: { action: "sync_workspace_to_sculptor", workspace_id: workspaceId },
      });
      if (error) throw error;
      await loadWorkspaces();
      return true;
    } catch (err) {
      console.error("Sync to sculptor failed:", err);
      return false;
    }
  }, [loadWorkspaces]);

  const unlinkFromSculptor = useCallback(async (workspaceId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("workspaces")
        .update({ external_workspace_id: null, external_source: null, status: "active" } as any)
        .eq("id", workspaceId);
      if (error) throw error;
      await loadWorkspaces();
      return true;
    } catch (err) {
      console.error("Unlink failed:", err);
      return false;
    }
  }, [loadWorkspaces]);

  const moveToTrash = useCallback(async (workspaceId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("workspaces")
        .update({ status: "trashed", deleted_at: new Date().toISOString() } as any)
        .eq("id", workspaceId);
      if (error) throw error;
      if (workspace?.id === workspaceId) {
        setWorkspaceState(null);
        localStorage.removeItem(WS_STORAGE_KEY);
      }
      await loadWorkspaces();
      return true;
    } catch (err) {
      console.error("Move to trash failed:", err);
      return false;
    }
  }, [loadWorkspaces, workspace]);

  const restoreFromTrash = useCallback(async (workspaceId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("workspaces")
        .update({ status: "active", deleted_at: null } as any)
        .eq("id", workspaceId);
      if (error) throw error;
      await loadWorkspaces();
      return true;
    } catch (err) {
      console.error("Restore failed:", err);
      return false;
    }
  }, [loadWorkspaces]);

  const permanentlyDelete = useCallback(async (workspaceId: string): Promise<boolean> => {
    try {
      // Delete members first, then workspace
      await supabase.from("workspace_members").delete().eq("workspace_id", workspaceId);
      const { error } = await supabase.from("workspaces").delete().eq("id", workspaceId);
      if (error) throw error;
      await loadWorkspaces();
      return true;
    } catch (err) {
      console.error("Permanent delete failed:", err);
      return false;
    }
  }, [loadWorkspaces]);

  const createWorkspace = useCallback(async (name: string, description?: string, syncToSculptor?: boolean): Promise<Workspace | null> => {
    if (!user) return null;

    const { data, error } = await supabase.rpc("create_workspace_with_owner", {
      _name: name,
      _description: description ?? null,
    });

    if (error || !data) return null;

    const { data: ws } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", data)
      .single();

    if (!ws) return null;

    const newWs = ws as Workspace;
    setWorkspaces((prev) => [newWs, ...prev]);
    setWorkspace(newWs);

    if (syncToSculptor) {
      await syncWorkspaceToSculptor(newWs.id);
    }

    return newWs;
  }, [user, setWorkspace, syncWorkspaceToSculptor]);

  return (
    <WorkspaceContext.Provider value={{
      workspace, workspaces, trashedWorkspaces, setWorkspace, loading,
      createWorkspace, syncWorkspaceToSculptor, unlinkFromSculptor,
      moveToTrash, restoreFromTrash, permanentlyDelete, refreshWorkspaces: loadWorkspaces,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}
