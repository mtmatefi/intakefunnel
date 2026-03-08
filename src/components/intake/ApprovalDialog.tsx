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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateApproval } from '@/hooks/useApprovals';
import { toast } from 'sonner';
import { CheckCircle, XCircle, RotateCcw, Loader2, Shield } from 'lucide-react';

interface ApprovalDialogProps {
  intakeId: string;
  intakeTitle: string;
  routingPath?: string;
}

const dataZones = [
  { value: 'green', label: 'Green – Keine sensiblen Daten', color: 'bg-success' },
  { value: 'yellow', label: 'Yellow – Interne Daten', color: 'bg-warning' },
  { value: 'red', label: 'Red – Vertraulich/Eingeschränkt', color: 'bg-destructive' },
];

const testTypes = ['unit', 'integration', 'e2e', 'security', 'performance'] as const;
const reviewTypes = ['code', 'architecture', 'security', 'data'] as const;

export function ApprovalDialog({ intakeId, intakeTitle, routingPath }: ApprovalDialogProps) {
  const [open, setOpen] = useState(false);
  const [decision, setDecision] = useState<'approved' | 'rejected' | 'needs_revision'>('approved');
  const [comments, setComments] = useState('');
  const [dataZone, setDataZone] = useState('green');
  const [requiredTests, setRequiredTests] = useState<string[]>(['unit', 'integration']);
  const [requiredReviews, setRequiredReviews] = useState<string[]>(['code']);
  
  const createApproval = useCreateApproval();

  const toggleItem = (list: string[], item: string, setter: (v: string[]) => void) => {
    setter(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
  };

  const handleSubmit = async () => {
    try {
      await createApproval.mutateAsync({
        intakeId,
        decision,
        comments: comments || undefined,
        guardrails: decision === 'approved' ? {
          dataZone,
          requiredTests,
          requiredReviews,
          allowedTechnologies: [],
          releaseGates: [],
        } : undefined,
      });
      
      const messages = {
        approved: 'Intake genehmigt',
        rejected: 'Intake abgelehnt',
        needs_revision: 'Überarbeitung angefordert',
      };
      toast.success(messages[decision]);
      setOpen(false);
    } catch (error) {
      toast.error('Fehler bei der Entscheidung');
    }
  };

  const decisionConfig = {
    approved: { icon: CheckCircle, label: 'Genehmigen', variant: 'default' as const, color: 'text-success' },
    rejected: { icon: XCircle, label: 'Ablehnen', variant: 'destructive' as const, color: 'text-destructive' },
    needs_revision: { icon: RotateCcw, label: 'Überarbeitung', variant: 'outline' as const, color: 'text-warning' },
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Shield className="h-4 w-4" />
          Entscheidung treffen
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Intake-Entscheidung</DialogTitle>
          <DialogDescription>{intakeTitle}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Decision Buttons */}
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(decisionConfig) as Array<keyof typeof decisionConfig>).map((key) => {
              const config = decisionConfig[key];
              return (
                <Button
                  key={key}
                  variant={decision === key ? config.variant : 'outline'}
                  className="flex-col h-auto py-3 gap-1"
                  onClick={() => setDecision(key)}
                >
                  <config.icon className={`h-5 w-5 ${decision === key ? '' : config.color}`} />
                  <span className="text-xs">{config.label}</span>
                </Button>
              );
            })}
          </div>

          {/* Guardrails (only for approval) */}
          {decision === 'approved' && (
            <>
              <div className="space-y-2">
                <Label>Datenzone</Label>
                <Select value={dataZone} onValueChange={setDataZone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dataZones.map(z => (
                      <SelectItem key={z.value} value={z.value}>
                        <span className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${z.color}`} />
                          {z.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Pflicht-Tests</Label>
                <div className="flex flex-wrap gap-2">
                  {testTypes.map(t => (
                    <Badge
                      key={t}
                      variant={requiredTests.includes(t) ? 'default' : 'outline'}
                      className="cursor-pointer capitalize"
                      onClick={() => toggleItem(requiredTests, t, setRequiredTests)}
                    >
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Pflicht-Reviews</Label>
                <div className="flex flex-wrap gap-2">
                  {reviewTypes.map(r => (
                    <Badge
                      key={r}
                      variant={requiredReviews.includes(r) ? 'default' : 'outline'}
                      className="cursor-pointer capitalize"
                      onClick={() => toggleItem(requiredReviews, r, setRequiredReviews)}
                    >
                      {r}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Comments */}
          <div className="space-y-2">
            <Label>Kommentar {decision !== 'approved' && '(Pflicht)'}</Label>
            <Textarea
              placeholder={decision === 'approved' ? 'Optionaler Kommentar...' : 'Begründung der Entscheidung...'}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
            />
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={createApproval.isPending || (decision !== 'approved' && !comments.trim())}
            className="w-full"
            variant={decision === 'rejected' ? 'destructive' : 'default'}
          >
            {createApproval.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <decisionConfig[decision].icon className="mr-2 h-4 w-4" />
            )}
            {decisionConfig[decision].label}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
