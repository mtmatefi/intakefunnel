import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Edit3, History, Loader2, Plus, User } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface SpecAmendmentDialogProps {
  intakeId: string;
  specId: string;
  onAmendmentAdded?: () => void;
}

interface Amendment {
  id: string;
  amended_by: string;
  amendment_type: string;
  field_name: string | null;
  original_value: string | null;
  new_value: string | null;
  reason: string;
  created_at: string;
  profile?: {
    display_name: string;
  };
}

const amendmentTypeLabels: Record<string, string> = {
  addition: 'Ergänzung',
  modification: 'Änderung',
  clarification: 'Klarstellung',
};

const fieldOptions = [
  { value: 'problemStatement', label: 'Problemstellung' },
  { value: 'goals', label: 'Ziele' },
  { value: 'users', label: 'Benutzer' },
  { value: 'constraints', label: 'Einschränkungen' },
  { value: 'integrations', label: 'Integrationen' },
  { value: 'nfrs', label: 'Nicht-funktionale Anforderungen' },
  { value: 'acceptanceCriteria', label: 'Akzeptanzkriterien' },
  { value: 'risks', label: 'Risiken' },
  { value: 'other', label: 'Sonstiges' },
];

export function SpecAmendmentDialog({ intakeId, specId, onAmendmentAdded }: SpecAmendmentDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amendmentType, setAmendmentType] = useState<string>('addition');
  const [fieldName, setFieldName] = useState<string>('');
  const [newValue, setNewValue] = useState('');
  const [reason, setReason] = useState('');

  // Fetch amendments history
  const { data: amendments = [], isLoading: amendmentsLoading } = useQuery({
    queryKey: ['spec-amendments', specId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('spec_amendments')
        .select(`
          *,
          profiles:amended_by(display_name)
        `)
        .eq('spec_id', specId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Amendment[];
    },
    enabled: open,
  });

  const handleSubmit = async () => {
    if (!user || !fieldName || !newValue || !reason) {
      toast.error('Bitte alle Felder ausfüllen');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('spec_amendments').insert({
        spec_id: specId,
        intake_id: intakeId,
        amended_by: user.id,
        amendment_type: amendmentType,
        field_name: fieldName,
        new_value: newValue,
        reason: reason,
      });

      if (error) throw error;

      toast.success('Ergänzung hinzugefügt');
      queryClient.invalidateQueries({ queryKey: ['spec-amendments', specId] });
      
      // Reset form
      setAmendmentType('addition');
      setFieldName('');
      setNewValue('');
      setReason('');
      
      onAmendmentAdded?.();
    } catch (error) {
      toast.error('Fehler beim Speichern');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canAmend = user?.role === 'architect' || user?.role === 'admin';

  if (!canAmend) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Edit3 className="h-4 w-4" />
          Ergänzungen
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Spezifikation ergänzen
          </DialogTitle>
          <DialogDescription>
            Fügen Sie Ergänzungen oder Änderungen zur Spezifikation hinzu. Alle Änderungen werden protokolliert.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* New Amendment Form */}
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Plus className="h-4 w-4" />
              Neue Ergänzung
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Art der Änderung</Label>
                <Select value={amendmentType} onValueChange={setAmendmentType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="addition">Ergänzung</SelectItem>
                    <SelectItem value="modification">Änderung</SelectItem>
                    <SelectItem value="clarification">Klarstellung</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Bereich</Label>
                <Select value={fieldName} onValueChange={setFieldName}>
                  <SelectTrigger>
                    <SelectValue placeholder="Bereich wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Inhalt der Ergänzung</Label>
              <Textarea
                placeholder="Was möchten Sie ergänzen oder ändern?"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Begründung</Label>
              <Input
                placeholder="Warum wird diese Änderung vorgenommen?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Ergänzung hinzufügen
            </Button>
          </div>

          <Separator />

          {/* History */}
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center gap-2 text-sm font-medium mb-3">
              <History className="h-4 w-4" />
              Änderungshistorie
            </div>
            
            <ScrollArea className="h-[200px]">
              {amendmentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : amendments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Noch keine Ergänzungen vorhanden
                </p>
              ) : (
                <div className="space-y-3 pr-4">
                  {amendments.map((amendment) => (
                    <div key={amendment.id} className="p-3 border border-border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {amendmentTypeLabels[amendment.amendment_type] || amendment.amendment_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {fieldOptions.find(f => f.value === amendment.field_name)?.label || amendment.field_name}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(amendment.created_at).toLocaleString('de-DE')}
                        </span>
                      </div>
                      <p className="text-sm">{amendment.new_value}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        {(amendment as any).profiles?.display_name || 'Unbekannt'}
                        <span>•</span>
                        <span>{amendment.reason}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}