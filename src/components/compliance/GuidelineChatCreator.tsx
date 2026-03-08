import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Check,
  Eye,
  MessageSquare,
  Plus,
  AlertTriangle,
  Pencil,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import type { Guideline, GuidelineInsert } from '@/hooks/useGuidelines';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ParsedGuideline {
  name?: string;
  description?: string;
  type?: string;
  compliance_framework?: string;
  severity?: string;
  risk_categories?: string[];
  review_frequency_days?: number;
  content_markdown?: string;
}

interface Props {
  onSave: (data: GuidelineInsert) => void;
  onUpdate?: (data: Partial<Guideline> & { id: string }) => void;
  userId: string;
  onClose: () => void;
  editingGuideline?: Guideline | null;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-guideline`;

const QUICK_PROMPTS = [
  { label: 'Security Policy', prompt: 'Erstelle eine Security Policy basierend auf NIST CSF und OWASP Top 10' },
  { label: 'Architecture Principle', prompt: 'Erstelle ein Enterprise Architecture Principle nach TOGAF' },
  { label: 'DevOps Standard', prompt: 'Erstelle einen CI/CD Pipeline Standard mit DORA Metrics' },
  { label: 'ITAR Compliance', prompt: 'Erstelle eine ITAR Export Control Guideline' },
  { label: 'DSGVO Policy', prompt: 'Erstelle eine DSGVO-konforme Datenschutzrichtlinie' },
];

function parseGuidelineFromContent(content: string): ParsedGuideline | null {
  const match = content.match(/```guideline-json\s*([\s\S]*?)```/);
  if (!match) return null;
  try {
    return JSON.parse(match[1].trim());
  } catch {
    return null;
  }
}

function stripGuidelineBlock(content: string): string {
  return content.replace(/```guideline-json[\s\S]*?```/g, '').trim();
}

export function GuidelineChatCreator({ onSave, onUpdate, userId, onClose, editingGuideline: existingGuideline }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [parsedGuideline, setParsedGuideline] = useState<ParsedGuideline | null>(null);
  const [attachments, setAttachments] = useState<{ type: 'link' | 'text'; value: string; label: string }[]>([]);
  const [linkInput, setLinkInput] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!existingGuideline;
  const initRef = useRef(false);

  // Initialize editing mode with existing guideline context
  useEffect(() => {
    if (existingGuideline && !initRef.current) {
      initRef.current = true;
      const guidelineJson: ParsedGuideline = {
        name: existingGuideline.name,
        description: existingGuideline.description || undefined,
        type: existingGuideline.type,
        compliance_framework: existingGuideline.compliance_framework,
        severity: existingGuideline.severity,
        risk_categories: existingGuideline.risk_categories || [],
        review_frequency_days: existingGuideline.review_frequency_days,
        content_markdown: existingGuideline.content_markdown,
      };
      setParsedGuideline(guidelineJson);

      // Seed the chat with the existing guideline as assistant context
      const contextMsg: ChatMessage = {
        role: 'assistant',
        content: `Ich habe die bestehende Guideline **"${existingGuideline.name}"** geladen. Du kannst sie jetzt per Chat überarbeiten.\n\nSag mir z.B.:\n- "Erweitere den Security-Abschnitt"\n- "Füge OWASP Top 10 Referenzen hinzu"\n- "Ändere den Schweregrad auf kritisch"\n- "Ergänze Risikokategorien für Cloud Security"\n\n\`\`\`guideline-json\n${JSON.stringify(guidelineJson, null, 2)}\n\`\`\``,
      };
      setMessages([contextMsg]);
    }
  }, [existingGuideline]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Parse guideline from latest assistant message
  useEffect(() => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
    if (lastAssistant) {
      const parsed = parseGuidelineFromContent(lastAssistant.content);
      if (parsed) setParsedGuideline(parsed);
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
          context: { includeExistingGuidelines: messages.length === 0 },
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
    [messages.length]
  );

  const sendMessage = async (text?: string) => {
    const msgText = text || input.trim();
    if (!msgText && attachments.length === 0) return;

    // Build message with attachments
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} ist zu groß (max 5MB)`);
        continue;
      }
      try {
        const text = await file.text();
        setAttachments((prev) => [
          ...prev,
          { type: 'text', value: text.slice(0, 10000), label: file.name },
        ]);
        toast.success(`${file.name} hinzugefügt`);
      } catch {
        toast.error(`${file.name} konnte nicht gelesen werden`);
      }
    }
    e.target.value = '';
  };

  const addLink = () => {
    if (!linkInput.trim()) return;
    setAttachments((prev) => [
      ...prev,
      { type: 'link', value: linkInput.trim(), label: linkInput.trim() },
    ]);
    setLinkInput('');
    setShowLinkInput(false);
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveGuideline = () => {
    if (!parsedGuideline?.name || !parsedGuideline?.content_markdown) {
      toast.error('Guideline ist noch nicht vollständig. Chatte weiter mit der KI.');
      return;
    }

    if (isEditing && existingGuideline && onUpdate) {
      onUpdate({
        id: existingGuideline.id,
        name: parsedGuideline.name,
        description: parsedGuideline.description || null,
        content_markdown: parsedGuideline.content_markdown,
        type: parsedGuideline.type || 'policy',
        compliance_framework: parsedGuideline.compliance_framework || 'general',
        severity: parsedGuideline.severity || 'medium',
        risk_categories: parsedGuideline.risk_categories || [],
        review_frequency_days: parsedGuideline.review_frequency_days || 365,
      } as any);
    } else {
      onSave({
        name: parsedGuideline.name,
        description: parsedGuideline.description,
        content_markdown: parsedGuideline.content_markdown,
        type: parsedGuideline.type || 'policy',
        compliance_framework: parsedGuideline.compliance_framework || 'general',
        severity: parsedGuideline.severity || 'medium',
        risk_categories: parsedGuideline.risk_categories || [],
        review_frequency_days: parsedGuideline.review_frequency_days || 365,
        created_by: userId,
      });
    }
  };

  const severityColors: Record<string, string> = {
    critical: 'bg-destructive text-destructive-foreground',
    high: 'bg-destructive/80 text-destructive-foreground',
    medium: 'bg-warning text-warning-foreground',
    low: 'bg-secondary text-secondary-foreground',
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] gap-4">
      {/* LEFT: Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="pb-3 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isEditing ? <Pencil className="h-5 w-5 text-primary" /> : <MessageSquare className="h-5 w-5 text-primary" />}
                <CardTitle className="text-base">
                  {isEditing ? `Bearbeiten: ${existingGuideline?.name}` : 'KI Guideline-Assistent'}
                </CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <Separator />

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8 space-y-4">
                <Sparkles className="h-10 w-10 mx-auto text-primary/50" />
                <div>
                  <h3 className="font-semibold text-foreground">Guideline per Chat erstellen</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Beschreibe was du brauchst, lade Dokumente hoch oder teile Links.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {QUICK_PROMPTS.map((qp) => (
                    <Button
                      key={qp.label}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => sendMessage(qp.prompt)}
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      {qp.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-foreground'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      <ReactMarkdown>{stripGuidelineBlock(msg.content)}</ReactMarkdown>
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

          {/* Attachments bar */}
          {attachments.length > 0 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {attachments.map((a, i) => (
                <Badge key={i} variant="secondary" className="gap-1 text-xs">
                  {a.type === 'link' ? <Link2 className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                  {a.label.length > 30 ? a.label.slice(0, 30) + '…' : a.label}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeAttachment(i)} />
                </Badge>
              ))}
            </div>
          )}

          {/* Link input */}
          {showLinkInput && (
            <div className="px-4 pb-2 flex gap-2">
              <Input
                placeholder="https://..."
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addLink()}
                className="text-sm"
                autoFocus
              />
              <Button size="sm" onClick={addLink}>
                <Plus className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowLinkInput(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Input bar */}
          <div className="p-4 pt-2 border-t border-border shrink-0">
            <div className="flex gap-2">
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                  title="Dokument hochladen"
                >
                  <Upload className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={() => setShowLinkInput(!showLinkInput)}
                  title="Link hinzufügen"
                >
                  <Link2 className="h-4 w-4" />
                </Button>
              </div>
              <Input
                ref={inputRef}
                placeholder="Beschreibe deine Guideline..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                disabled={isLoading}
              />
              <Button
                onClick={() => sendMessage()}
                disabled={isLoading || (!input.trim() && attachments.length === 0)}
                className="shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".txt,.md,.csv,.json,.xml,.yaml,.yml,.pdf,.doc,.docx"
              multiple
              onChange={handleFileUpload}
            />
          </div>
        </Card>
      </div>

      {/* RIGHT: Live Preview */}
      <div className="w-[480px] flex flex-col shrink-0">
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="pb-3 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Live-Vorschau</CardTitle>
              </div>
              {parsedGuideline?.name && (
                <Button size="sm" onClick={handleSaveGuideline} className="gap-1.5">
                  <Check className="h-3.5 w-3.5" />
                  {isEditing ? 'Aktualisieren' : 'Speichern'}
                </Button>
              )}
            </div>
          </CardHeader>

          <Separator />

          <ScrollArea className="flex-1">
            <div className="p-4">
              {parsedGuideline ? (
                <div className="space-y-4">
                  {/* Metadata */}
                  <div className="space-y-2">
                    <h2 className="text-lg font-bold text-foreground">
                      {parsedGuideline.name || 'Unbenannte Guideline'}
                    </h2>
                    {parsedGuideline.description && (
                      <p className="text-sm text-muted-foreground">{parsedGuideline.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {parsedGuideline.compliance_framework && (
                        <Badge variant="outline" className="text-xs">
                          {parsedGuideline.compliance_framework}
                        </Badge>
                      )}
                      {parsedGuideline.severity && (
                        <Badge
                          className={`text-xs ${
                            severityColors[parsedGuideline.severity] || severityColors.medium
                          }`}
                        >
                          {parsedGuideline.severity.toUpperCase()}
                        </Badge>
                      )}
                      {parsedGuideline.type && (
                        <Badge variant="secondary" className="text-xs">
                          {parsedGuideline.type}
                        </Badge>
                      )}
                    </div>
                    {parsedGuideline.risk_categories && parsedGuideline.risk_categories.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                        {parsedGuideline.risk_categories.map((r) => (
                          <Badge key={r} variant="outline" className="text-xs">
                            {r}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Markdown content */}
                  {parsedGuideline.content_markdown ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown>{parsedGuideline.content_markdown}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Inhalt wird generiert...
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 space-y-3">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground/30" />
                  <div>
                    <h3 className="font-semibold text-foreground">Noch keine Guideline</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Starte den Chat links – die Guideline erscheint hier live.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}
