import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Plus, Search, Shield, Loader2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { ComplianceFrameworkTabs } from '@/components/compliance/ComplianceFrameworkTabs';
import { ComplianceStats } from '@/components/compliance/ComplianceStats';
import { GuidelineCard } from '@/components/compliance/GuidelineCard';
import { GuidelineEditorDialog } from '@/components/compliance/GuidelineEditorDialog';
import { GuidelineChatCreator } from '@/components/compliance/GuidelineChatCreator';
import {
  useGuidelines,
  useCreateGuideline,
  useUpdateGuideline,
  useDeleteGuideline,
  type Guideline,
  type GuidelineInsert,
} from '@/hooks/useGuidelines';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function PoliciesPage() {
  const { user } = useAuth();
  const [activeFramework, setActiveFramework] = useState('all');
  const [search, setSearch] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingGuideline, setEditingGuideline] = useState<Guideline | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState(false);

  const { data: guidelines = [], isLoading } = useGuidelines();
  const createMutation = useCreateGuideline();
  const updateMutation = useUpdateGuideline();
  const deleteMutation = useDeleteGuideline();

  if (!user || (user.role !== 'admin' && user.role !== 'architect')) {
    return (
      <AppLayout>
        <div className="p-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <h2 className="text-xl font-bold mb-2">Zugriff eingeschränkt</h2>
              <p className="text-muted-foreground">
                Nur Admins und Architects können Compliance-Guidelines verwalten.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const filtered = guidelines
    .filter((g) => activeFramework === 'all' || g.compliance_framework === activeFramework)
    .filter((g) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        g.name.toLowerCase().includes(q) ||
        (g.description || '').toLowerCase().includes(q) ||
        g.content_markdown.toLowerCase().includes(q) ||
        (g.risk_categories || []).some((r) => r.toLowerCase().includes(q))
      );
    });

  const handleSave = (data: GuidelineInsert | (Partial<Guideline> & { id: string })) => {
    if ('id' in data && data.id) {
      updateMutation.mutate(data as any, {
        onSuccess: () => toast.success('Guideline aktualisiert'),
        onError: (err) => toast.error('Fehler: ' + err.message),
      });
    } else {
      createMutation.mutate(data as GuidelineInsert, {
        onSuccess: () => toast.success('Guideline erstellt'),
        onError: (err) => toast.error('Fehler: ' + err.message),
      });
    }
  };

  const handleToggleActive = (id: string, active: boolean) => {
    updateMutation.mutate({ id, is_active: active } as any, {
      onSuccess: () => toast.success(active ? 'Aktiviert' : 'Deaktiviert'),
    });
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success('Guideline gelöscht');
        setDeleteId(null);
      },
      onError: (err) => toast.error('Fehler: ' + err.message),
    });
  };

  return (
    <AppLayout>
      {chatMode ? (
        <div className="p-6 max-w-7xl">
          <GuidelineChatCreator
            userId={user.id}
            onClose={() => setChatMode(false)}
            onSave={(data) => {
              createMutation.mutate(data, {
                onSuccess: () => {
                  toast.success('Guideline per Chat erstellt!');
                  setChatMode(false);
                },
                onError: (err) => toast.error('Fehler: ' + err.message),
              });
            }}
          />
        </div>
      ) : (
        <div className="p-6 space-y-5 max-w-6xl">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Shield className="h-7 w-7 text-primary" />
                <h1 className="text-2xl font-bold text-foreground">Compliance & Guidelines</h1>
              </div>
              <p className="text-muted-foreground mt-1">
                ITAR, Export Control, Security, DSGVO – KI-gestützt erstellen, mit Risiken verknüpfen
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" onClick={() => setChatMode(true)} className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Chat-Assistent
              </Button>
              <Button onClick={() => { setEditingGuideline(null); setEditorOpen(true); }} className="gap-2">
                <Plus className="h-4 w-4" />
                Neue Guideline
              </Button>
            </div>
          </div>

          {/* Stats */}
          <ComplianceStats guidelines={guidelines} />

          {/* Framework Tabs */}
          <ComplianceFrameworkTabs value={activeFramework} onChange={setActiveFramework} />

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Suche nach Name, Risiko, Inhalt..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Guidelines Grid */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
                <h3 className="font-semibold text-foreground mb-1">Keine Guidelines gefunden</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {search
                    ? 'Keine Ergebnisse für Ihre Suche'
                    : 'Erstellen Sie Ihre erste Compliance-Guideline mit KI-Unterstützung'}
                </p>
                {!search && (
                  <div className="flex gap-2 justify-center">
                    <Button variant="outline" onClick={() => setChatMode(true)}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Per Chat erstellen
                    </Button>
                    <Button variant="outline" onClick={() => { setEditingGuideline(null); setEditorOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Manuell erstellen
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filtered.map((g) => (
                <GuidelineCard
                  key={g.id}
                  guideline={g}
                  onEdit={(g) => { setEditingGuideline(g); setEditorOpen(true); }}
                  onDelete={setDeleteId}
                  onToggleActive={handleToggleActive}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Editor Dialog */}
      <GuidelineEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        guideline={editingGuideline}
        defaultFramework={activeFramework}
        onSave={handleSave}
        userId={user.id}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Guideline löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Die Guideline wird permanent gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
