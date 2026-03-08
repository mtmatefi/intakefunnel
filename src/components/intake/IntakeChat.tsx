import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Send,
  Loader2,
  Sparkles,
  FileText,
  Link2,
  Upload,
  X,
  Shield,
  MessageSquare,
  Plus,
  AlertTriangle,
  CheckCircle,
  GitBranch,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { useVersionedGuidelineUpdate } from '@/hooks/useGuidelineVersions';
import { useGuidelines } from '@/hooks/useGuidelines';
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

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface GuidelineChange {
  guideline_id: string;
  guideline_name: string;
  change_reason: string;
  proposed_changes: {
    content_markdown?: string | null;
    risk_categories?: string[];
    severity?: string | null;
  };
}

interface Props {
  intakeId: string;
  intakeTitle: string;
  userId: string;
  userRole: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-guideline`;

const QUICK_ACTIONS = [
  { label: 'Compliance prüfen', prompt: 'Führe eine vollständige Compliance-Prüfung dieses Intakes gegen alle aktiven Guidelines durch.' },
  { label: 'Risiken analysieren', prompt: 'Analysiere die Risiken dieses Intakes im Detail – Security, Architecture, DevOps.' },
  { label: 'Anforderungen verfeinern', prompt: 'Welche Anforderungen fehlen in diesem Intake? Was sollte ergänzt werden?' },
  { label: 'Architecture Review', prompt: 'Bewerte die Architektur-Aspekte dieses Intakes gegen die Enterprise und Solution Architecture Guidelines.' },
];

function parseGuidelineChanges(content: string): GuidelineChange[] {
  const changes: GuidelineChange[] = [];
  const regex = /```guideline-change\s*([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    try {
      changes.push(JSON.parse(match[1].trim()));
    } catch { /* skip invalid */ }
  }
  return changes;
}

function stripSpecialBlocks(content: string): string {
  return content
    .replace(/```guideline-change[\s\S]*?```/g, '')
    .replace(/```intake-update[\s\S]*?```/g, '')
    .trim();
}

export function IntakeChat({ intakeId, intakeTitle, userId, userRole }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<GuidelineChange[]>([]);
  const [confirmChange, setConfirmChange] = useState<GuidelineChange | null>(null);
  const [attachments, setAttachments] = useState<{ type: 'link' | 'text'; value: string; label: string }[]>([]);
  const [linkInput, setLinkInput] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const versionedUpdate = useVersionedGuidelineUpdate();
  const { data: guidelines = [] } = useGuidelines();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Extract guideline changes from latest assistant message
  useEffect(() => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
    if (lastAssistant) {
      const changes = parseGuidelineChanges(lastAssistant.content);
      if (changes.length > 0) setPendingChanges(changes);
    }
  }, [messages]);

  const streamChat = useCallback(
    async (chatMessages: ChatMessage[]) => {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: chatMessages,
          context: {
            mode: 'intake',
            intakeId,
            includeExistingGuidelines: true,
          },
        }),
      });

      if (resp.status === 429) {
        toast.error('Rate Limit erreicht. Bitte warte einen Moment.');
        return;
      }
      if (resp.status === 402) {
        toast.error('AI-Credits aufgebraucht. Bitte Credits aufladen.');
        return;
      }
      if (!resp.ok || !resp.body) throw new Error('Stream konnte nicht gestartet werden');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return [...prev, { role: 'assistant', content: assistantContent }];
              });
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
    },
    [intakeId]
  );

  const sendMessage = async (text?: string) => {
    const msgText = text || input.trim();
    if (!msgText && attachments.length === 0) return;

    let fullMessage = msgText;
    if (attachments.length > 0) {
      fullMessage +=
        '\n\n--- Anhänge ---\n' +
        attachments
          .map((a) =>
            a.type === 'link'
              ? `🔗 Link: ${a.value}`
              : `📄 Dokument "${a.label}":\n${a.value}`
          )
          .join('\n\n');
    }

    const userMsg: ChatMessage = { role: 'user', content: fullMessage };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setAttachments([]);
    setPendingChanges([]);
    setIsLoading(true);

    try {
      await streamChat(newMessages);
    } catch (e) {
      console.error(e);
      toast.error('Fehler beim Senden der Nachricht');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleApplyGuidelineChange = async (change: GuidelineChange) => {
    try {
      const updates: Record<string, any> = {};
      if (change.proposed_changes.content_markdown) updates.content_markdown = change.proposed_changes.content_markdown;
      if (change.proposed_changes.risk_categories) updates.risk_categories = change.proposed_changes.risk_categories;
      if (change.proposed_changes.severity) updates.severity = change.proposed_changes.severity;

      await versionedUpdate.mutateAsync({
        guidelineId: change.guideline_id,
        updates,
        changedBy: userId,
        changeReason: change.change_reason,
        changeSource: `intake_chat:${intakeId}`,
        intakeId,
      });

      toast.success(`Guideline "${change.guideline_name}" aktualisiert (versioniert)`, {
        description: change.change_reason,
      });

      setPendingChanges((prev) => prev.filter((c) => c.guideline_id !== change.guideline_id));
      setConfirmChange(null);
    } catch (err: any) {
      toast.error('Fehler beim Aktualisieren: ' + err.message);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name} zu groß (max 5MB)`); continue; }
      try {
        const text = await file.text();
        setAttachments((prev) => [...prev, { type: 'text', value: text.slice(0, 10000), label: file.name }]);
        toast.success(`${file.name} hinzugefügt`);
      } catch { toast.error(`${file.name} konnte nicht gelesen werden`); }
    }
    e.target.value = '';
  };

  const addLink = () => {
    if (!linkInput.trim()) return;
    setAttachments((prev) => [...prev, { type: 'link', value: linkInput.trim(), label: linkInput.trim() }]);
    setLinkInput('');
    setShowLinkInput(false);
  };

  const canModifyGuidelines = userRole === 'architect' || userRole === 'admin';

  return (
    <div className="space-y-4">
      <Card className="flex flex-col" style={{ height: 'calc(100vh - 24rem)' }}>
        <CardHeader className="pb-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Intake-Chat & Compliance-Prüfung</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">{intakeTitle}</Badge>
          </div>
        </CardHeader>

        <Separator />

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-6 space-y-4">
              <Shield className="h-10 w-10 mx-auto text-primary/50" />
              <div>
                <h3 className="font-semibold text-foreground">Intake per Chat verfeinern</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Compliance prüfen, Anforderungen verfeinern, Guidelines anpassen
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {QUICK_ACTIONS.map((qa) => (
                  <Button key={qa.label} variant="outline" size="sm" className="text-xs" onClick={() => sendMessage(qa.prompt)}>
                    <Sparkles className="h-3 w-3 mr-1" />
                    {qa.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm ${
                msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-foreground'
              }`}>
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    <ReactMarkdown>{stripSpecialBlocks(msg.content)}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex justify-start">
              <div className="bg-muted/50 rounded-lg px-4 py-2.5">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>

        {/* Pending guideline changes */}
        {pendingChanges.length > 0 && canModifyGuidelines && (
          <div className="px-4 pb-2 space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <GitBranch className="h-3 w-3" /> Vorgeschlagene Guideline-Änderungen:
            </p>
            {pendingChanges.map((change, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-warning/10 border border-warning/30 rounded-md text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                  <span className="truncate font-medium">{change.guideline_name}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 gap-1 text-xs"
                  onClick={() => setConfirmChange(change)}
                >
                  <CheckCircle className="h-3 w-3" /> Übernehmen
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="px-4 pb-2 flex flex-wrap gap-1.5">
            {attachments.map((a, i) => (
              <Badge key={i} variant="secondary" className="gap-1 text-xs">
                {a.type === 'link' ? <Link2 className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                {a.label.length > 30 ? a.label.slice(0, 30) + '…' : a.label}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setAttachments((p) => p.filter((_, j) => j !== i))} />
              </Badge>
            ))}
          </div>
        )}

        {showLinkInput && (
          <div className="px-4 pb-2 flex gap-2">
            <Input placeholder="https://..." value={linkInput} onChange={(e) => setLinkInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addLink()} className="text-sm" autoFocus />
            <Button size="sm" onClick={addLink}><Plus className="h-4 w-4" /></Button>
            <Button size="sm" variant="ghost" onClick={() => setShowLinkInput(false)}><X className="h-4 w-4" /></Button>
          </div>
        )}

        {/* Input */}
        <div className="p-4 pt-2 border-t border-border shrink-0">
          <div className="flex gap-2">
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => fileInputRef.current?.click()} title="Dokument hochladen">
                <Upload className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => setShowLinkInput(!showLinkInput)} title="Link hinzufügen">
                <Link2 className="h-4 w-4" />
              </Button>
            </div>
            <Input
              ref={inputRef}
              placeholder="Frage zur Compliance, Risiken, oder Anforderungen..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              disabled={isLoading}
            />
            <Button onClick={() => sendMessage()} disabled={isLoading || (!input.trim() && attachments.length === 0)} className="shrink-0">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <input ref={fileInputRef} type="file" className="hidden" accept=".txt,.md,.csv,.json,.xml,.yaml,.yml,.pdf,.doc,.docx" multiple onChange={handleFileUpload} />
        </div>
      </Card>

      {/* Confirm guideline change dialog */}
      <AlertDialog open={!!confirmChange} onOpenChange={(open) => !open && setConfirmChange(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Guideline-Änderung übernehmen?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p><strong>Guideline:</strong> {confirmChange?.guideline_name}</p>
              <p><strong>Begründung:</strong> {confirmChange?.change_reason}</p>
              <p className="text-xs text-muted-foreground">
                Die Änderung wird versioniert gespeichert mit Ihrem Namen, Zeitstempel und Begründung. 
                Der Intake "{intakeTitle}" wird als Auslöser vermerkt.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmChange && handleApplyGuidelineChange(confirmChange)}
              disabled={versionedUpdate.isPending}
            >
              {versionedUpdate.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Änderung versioniert übernehmen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
