import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import {
  Shield, Building2, Users, Plus, Trash2, Search, Pencil, Save, X,
  UserPlus, ChevronDown, ChevronRight, Unlink, Power, PowerOff,
  RotateCcw, AlertTriangle, Link2, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import AppLayout from "@/components/layout/AppLayout";

type UserRole = "requester" | "architect" | "engineer_lead" | "admin";

const ROLES: { value: UserRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "architect", label: "Architect" },
  { value: "engineer_lead", label: "Engineer Lead" },
  { value: "requester", label: "Requester" },
];

const WS_MEMBER_ROLES = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
  { value: "viewer", label: "Viewer" },
];

type WsTab = "active" | "inactive" | "trashed";

function statusBadge(status: string) {
  if (status === "inactive") return <Badge variant="secondary" className="bg-yellow-500/15 text-yellow-600 border-yellow-500/30"><PowerOff className="mr-1 h-3 w-3" />Inaktiv</Badge>;
  if (status === "trashed") return <Badge variant="destructive" className="gap-1"><Trash2 className="h-3 w-3" />Papierkorb</Badge>;
  return <Badge variant="outline" className="text-green-600 border-green-500/30"><Power className="mr-1 h-3 w-3" />Aktiv</Badge>;
}

export default function PlatformAdmin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [newWsName, setNewWsName] = useState("");
  const [newWsDesc, setNewWsDesc] = useState("");
  const [showCreateWs, setShowCreateWs] = useState(false);
  const [expandedWs, setExpandedWs] = useState<string | null>(null);
  const [editingWs, setEditingWs] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [invitingWs, setInvitingWs] = useState<string | null>(null);
  const [wsTab, setWsTab] = useState<WsTab>("active");
  const [syncingWs, setSyncingWs] = useState<string | null>(null);

  // Check if user is admin
  const { data: isAdmin, isLoading: checkingAdmin } = useQuery({
    queryKey: ["is-platform-admin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "admin")
        .limit(1);
      return (data?.length ?? 0) > 0;
    },
  });

  const { data: workspaces = [] } = useQuery({
    queryKey: ["all-workspaces"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const { data } = await supabase.from("workspaces").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: allMembers = [] } = useQuery({
    queryKey: ["all-members"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const { data: memberData } = await supabase
        .from("workspace_members")
        .select("id, user_id, workspace_id, role");
      if (!memberData?.length) return [];
      const userIds = [...new Set(memberData.map(m => m.user_id))];
      const { data: profileData } = await supabase
        .from("profiles")
        .select("user_id, display_name, email")
        .in("user_id", userIds);
      const profileMap = new Map((profileData ?? []).map(p => [p.user_id, p]));
      return memberData.map(m => ({ ...m, profiles: profileMap.get(m.user_id) ?? null })) as any[];
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["all-workspaces"] });
    queryClient.invalidateQueries({ queryKey: ["all-members"] });
  };

  const createWs = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("create_workspace_with_owner", { _name: newWsName, _description: newWsDesc || undefined });
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); setNewWsName(""); setNewWsDesc(""); setShowCreateWs(false); toast.success("Workspace erstellt"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateWs = useMutation({
    mutationFn: async ({ id, name, description }: { id: string; name: string; description: string }) => {
      const { error } = await supabase.from("workspaces").update({ name, description }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); setEditingWs(null); toast.success("Workspace aktualisiert"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deactivateWs = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workspaces").update({ status: "inactive" } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast.success("Workspace deaktiviert"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const reactivateWs = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workspaces").update({ status: "active", deleted_at: null } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast.success("Workspace reaktiviert"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const trashWs = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workspaces").update({ status: "trashed", deleted_at: new Date().toISOString() } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast.success("Workspace in den Papierkorb verschoben"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const restoreWs = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workspaces").update({ status: "active", deleted_at: null } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast.success("Workspace wiederhergestellt"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const permanentDeleteWs = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("workspace_members").delete().eq("workspace_id", id);
      const { error } = await supabase.from("workspaces").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast.success("Workspace endgültig gelöscht"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const unlinkWs = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workspaces").update({ external_workspace_id: null, external_source: null } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast.success("Verknüpfung mit Strategy Sculptor entfernt"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSyncToSculptor = async (wsId: string) => {
    setSyncingWs(wsId);
    try {
      const { error } = await supabase.functions.invoke("sync-to-sculptor", {
        body: { action: "sync_workspace_to_sculptor", workspace_id: wsId },
      });
      if (error) throw error;
      invalidateAll();
      toast.success("Workspace mit Strategy Sculptor synchronisiert!");
    } catch (err: any) {
      toast.error("Sync fehlgeschlagen: " + (err.message || "Unbekannter Fehler"));
    } finally {
      setSyncingWs(null);
    }
  };

  const updateMemberRole = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      const { error } = await supabase.from("workspace_members").update({ role }).eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast.success("Rolle aktualisiert"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from("workspace_members").delete().eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast.success("Mitglied entfernt"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const addMember = useMutation({
    mutationFn: async ({ workspaceId, email, role }: { workspaceId: string; email: string; role: string }) => {
      const { data: profile } = await supabase
        .from("profiles").select("user_id").eq("email", email.trim().toLowerCase()).single();
      if (!profile) throw new Error("Benutzer mit dieser E-Mail nicht gefunden.");
      const { error } = await supabase.from("workspace_members").insert({ workspace_id: workspaceId, user_id: profile.user_id, role });
      if (error) { if (error.code === "23505") throw new Error("Benutzer ist bereits Mitglied."); throw error; }
    },
    onSuccess: () => { invalidateAll(); setInviteEmail(""); setInviteRole("member"); setInvitingWs(null); toast.success("Mitglied hinzugefügt"); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (checkingAdmin) return <AppLayout><div className="flex h-64 items-center justify-center text-muted-foreground">Laden…</div></AppLayout>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const filteredWorkspaces = workspaces.filter((ws: any) => {
    const status = (ws as any).status || "active";
    return status === wsTab;
  });

  const membersByWs = filteredWorkspaces.map((ws) => ({
    ...ws,
    members: allMembers.filter((m: any) => m.workspace_id === ws.id),
  }));

  const filteredMembers = allMembers.filter((m: any) => {
    const q = search.toLowerCase();
    return !q || m.profiles?.display_name?.toLowerCase().includes(q) || m.profiles?.email?.toLowerCase().includes(q);
  });

  const counts = {
    active: workspaces.filter((ws: any) => ((ws as any).status || "active") === "active").length,
    inactive: workspaces.filter((ws: any) => (ws as any).status === "inactive").length,
    trashed: workspaces.filter((ws: any) => (ws as any).status === "trashed").length,
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Plattform-Administration</h1>
        </div>

        <Tabs defaultValue="workspaces">
          <TabsList>
            <TabsTrigger value="workspaces" className="gap-2"><Building2 className="h-4 w-4" /> Workspaces</TabsTrigger>
            <TabsTrigger value="users" className="gap-2"><Users className="h-4 w-4" /> Alle Benutzer</TabsTrigger>
          </TabsList>

          <TabsContent value="workspaces" className="space-y-4 mt-4">
            {/* Sub-tabs for workspace status */}
            <div className="flex gap-2 flex-wrap">
              <Button variant={wsTab === "active" ? "default" : "outline"} size="sm" onClick={() => setWsTab("active")}>
                <Power className="mr-1.5 h-3.5 w-3.5" /> Aktiv ({counts.active})
              </Button>
              <Button variant={wsTab === "inactive" ? "default" : "outline"} size="sm" onClick={() => setWsTab("inactive")}>
                <PowerOff className="mr-1.5 h-3.5 w-3.5" /> Inaktiv ({counts.inactive})
              </Button>
              <Button variant={wsTab === "trashed" ? "destructive" : "outline"} size="sm" onClick={() => setWsTab("trashed")}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Papierkorb ({counts.trashed})
              </Button>
            </div>

            {wsTab === "active" && (
              showCreateWs ? (
                <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                  <h3 className="font-semibold text-foreground">Neuen Workspace anlegen</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1"><Label>Name</Label><Input value={newWsName} onChange={(e) => setNewWsName(e.target.value)} placeholder="Unternehmen XYZ" /></div>
                    <div className="space-y-1"><Label>Beschreibung</Label><Input value={newWsDesc} onChange={(e) => setNewWsDesc(e.target.value)} placeholder="Optional" /></div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => createWs.mutate()} disabled={!newWsName.trim()}>Erstellen</Button>
                    <Button variant="outline" onClick={() => setShowCreateWs(false)}>Abbrechen</Button>
                  </div>
                </div>
              ) : (
                <Button onClick={() => setShowCreateWs(true)}><Plus className="mr-2 h-4 w-4" /> Neuen Workspace anlegen</Button>
              )
            )}

            {filteredWorkspaces.length === 0 && (
              <p className="text-muted-foreground text-sm py-8 text-center">
                {wsTab === "trashed" ? "Papierkorb ist leer" : wsTab === "inactive" ? "Keine inaktiven Workspaces" : "Keine aktiven Workspaces"}
              </p>
            )}

            <div className="space-y-3">
              {membersByWs.map((ws: any) => {
                const isExpanded = expandedWs === ws.id;
                const isEditing = editingWs === ws.id;
                const wsStatus = ws.status || "active";
                const isLinked = !!ws.external_workspace_id;

                return (
                  <div key={ws.id} className={`rounded-lg border border-border bg-card ${wsStatus === "trashed" ? "opacity-70" : ""}`}>
                    {/* Header */}
                    <div className="flex items-center gap-2 p-4 cursor-pointer" onClick={() => setExpandedWs(isExpanded ? null : ws.id)}>
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="flex gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                            <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 text-sm" />
                            <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Beschreibung" className="h-8 text-sm" />
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => updateWs.mutate({ id: ws.id, name: editName, description: editDesc })} disabled={!editName.trim()}><Save className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingWs(null)}><X className="h-4 w-4" /></Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-foreground">{ws.name}</h3>
                            {statusBadge(wsStatus)}
                            {isLinked && (
                              <Badge variant="outline" className="text-blue-600 border-blue-500/30 gap-1">
                                <Link2 className="h-3 w-3" /> Strategy Sculptor
                              </Badge>
                            )}
                            {ws.description && <span className="text-xs text-muted-foreground">— {ws.description}</span>}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <span className="text-xs text-muted-foreground mr-2">{ws.members.length} Mitgl.</span>

                        {wsStatus === "active" && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Bearbeiten" onClick={() => { setEditingWs(ws.id); setEditName(ws.name); setEditDesc(ws.description || ""); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {/* Sync to Sculptor */}
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary" title={isLinked ? "Re-Sync mit Strategy Sculptor" : "Mit Strategy Sculptor verknüpfen"}
                              disabled={syncingWs === ws.id}
                              onClick={() => handleSyncToSculptor(ws.id)}>
                              <RefreshCw className={`h-4 w-4 ${syncingWs === ws.id ? "animate-spin" : ""}`} />
                            </Button>
                            {isLinked && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-500 hover:text-orange-600" title="Strategy Sculptor entkoppeln"
                                onClick={() => { if (confirm(`Verknüpfung von "${ws.name}" zu Strategy Sculptor wirklich entfernen?`)) unlinkWs.mutate(ws.id); }}>
                                <Unlink className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-yellow-600 hover:text-yellow-700" title="Deaktivieren"
                              onClick={() => { if (confirm(`"${ws.name}" deaktivieren?`)) deactivateWs.mutate(ws.id); }}>
                              <PowerOff className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="In Papierkorb"
                              onClick={() => { if (confirm(`"${ws.name}" in den Papierkorb verschieben?`)) trashWs.mutate(ws.id); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}

                        {wsStatus === "inactive" && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700" title="Reaktivieren" onClick={() => reactivateWs.mutate(ws.id)}>
                              <Power className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="In Papierkorb"
                              onClick={() => { if (confirm(`"${ws.name}" in den Papierkorb verschieben?`)) trashWs.mutate(ws.id); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}

                        {wsStatus === "trashed" && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700" title="Wiederherstellen" onClick={() => restoreWs.mutate(ws.id)}>
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Endgültig löschen">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" /> Endgültig löschen</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Workspace <strong>"{ws.name}"</strong> und alle zugehörigen Daten werden unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                  <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => permanentDeleteWs.mutate(ws.id)}>
                                    Endgültig löschen
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Expanded: member list + add */}
                    {isExpanded && (
                      <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
                        {wsStatus !== "trashed" && (
                          invitingWs === ws.id ? (
                            <div className="flex flex-wrap gap-2 items-end rounded-md border border-border p-3 bg-muted/30">
                              <div className="space-y-1 flex-1 min-w-[200px]">
                                <Label className="text-xs">E-Mail</Label>
                                <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="user@firma.de" className="h-8 text-sm" />
                              </div>
                              <div className="space-y-1 w-44">
                                <Label className="text-xs">Rolle</Label>
                                <Select value={inviteRole} onValueChange={setInviteRole}>
                                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                  <SelectContent>{WS_MEMBER_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                              <Button size="sm" onClick={() => addMember.mutate({ workspaceId: ws.id, email: inviteEmail, role: inviteRole })} disabled={!inviteEmail.trim()}>Hinzufügen</Button>
                              <Button size="sm" variant="outline" onClick={() => setInvitingWs(null)}>Abbrechen</Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => setInvitingWs(ws.id)}>
                              <UserPlus className="mr-2 h-3.5 w-3.5" /> Mitglied hinzufügen
                            </Button>
                          )
                        )}

                        {wsStatus === "trashed" && ws.deleted_at && (
                          <p className="text-xs text-muted-foreground">
                            In Papierkorb seit: {new Date(ws.deleted_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}

                        {ws.members.length > 0 ? (
                          <div className="rounded-md border border-border overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead><tr className="border-b bg-muted/50">
                                <th className="px-3 py-2 text-left font-medium text-foreground">Name</th>
                                <th className="px-3 py-2 text-left font-medium text-foreground">E-Mail</th>
                                <th className="px-3 py-2 text-left font-medium text-foreground">Rolle</th>
                                <th className="px-3 py-2 w-10"></th>
                              </tr></thead>
                              <tbody>
                                {ws.members.map((m: any) => (
                                  <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30">
                                    <td className="px-3 py-2 font-medium text-foreground">{m.profiles?.display_name || "Unbekannt"}</td>
                                    <td className="px-3 py-2 text-muted-foreground">{m.profiles?.email || "—"}</td>
                                    <td className="px-3 py-2">
                                      <Select value={m.role} onValueChange={(v) => updateMemberRole.mutate({ memberId: m.id, role: v })}>
                                        <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent>{WS_MEMBER_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                                      </Select>
                                    </td>
                                    <td className="px-3 py-2">
                                      {m.user_id !== user?.id && (
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => {
                                          if (confirm("Mitglied wirklich entfernen?")) removeMember.mutate(m.id);
                                        }}><Trash2 className="h-3.5 w-3.5" /></Button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Keine Mitglieder</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-4 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Benutzer suchen…" className="pl-9" />
            </div>
            <div className="rounded-lg border border-border bg-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-foreground">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">E-Mail</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">Workspace</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">Rolle</th>
                </tr></thead>
                <tbody>
                  {filteredMembers.map((m: any) => {
                    const wsName = workspaces.find((w) => w.id === m.workspace_id)?.name ?? "—";
                    return (
                      <tr key={m.id} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium text-foreground">{m.profiles?.display_name || "Unbekannt"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{m.profiles?.email || "—"}</td>
                        <td className="px-4 py-3 text-foreground">{wsName}</td>
                        <td className="px-4 py-3">
                          <Select value={m.role} onValueChange={(v) => updateMemberRole.mutate({ memberId: m.id, role: v })}>
                            <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{WS_MEMBER_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                          </Select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
