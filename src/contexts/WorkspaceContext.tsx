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
}

interface WorkspaceContextType {
  workspace: Workspace | null;
  workspaces: Workspace[];
  setWorkspace: (ws: Workspace) => void;
  loading: boolean;
  createWorkspace: (name: string, description?: string) => Promise<Workspace | null>;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspace: null,
  workspaces: [],
  setWorkspace: () => {},
  loading: true,
  createWorkspace: async () => null,
  refreshWorkspaces: async () => {},
});

export const useWorkspace = () => useContext(WorkspaceContext);

const WS_STORAGE_KEY = "selected_workspace_id";

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workspace, setWorkspaceState] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWorkspaces = useCallback(async () => {
    if (!user) {
      setWorkspaces([]);
      setWorkspaceState(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from("workspaces")
      .select("*")
      .order("created_at", { ascending: false });

    const ws = (data ?? []) as Workspace[];
    setWorkspaces(ws);

    // Restore previously selected workspace
    const savedId = localStorage.getItem(WS_STORAGE_KEY);
    const saved = ws.find((w) => w.id === savedId);
    if (saved) {
      setWorkspaceState(saved);
    } else if (ws.length > 0) {
      setWorkspaceState(ws[0]);
      localStorage.setItem(WS_STORAGE_KEY, ws[0].id);
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

  const createWorkspace = useCallback(async (name: string, description?: string): Promise<Workspace | null> => {
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
    return newWs;
  }, [user, setWorkspace]);

  return (
    <WorkspaceContext.Provider value={{ workspace, workspaces, setWorkspace, loading, createWorkspace, refreshWorkspaces: loadWorkspaces }}>
      {children}
    </WorkspaceContext.Provider>
  );
}
