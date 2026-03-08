import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Plus, Trash2, Loader2, Settings2, Shield, Building, Pencil, X,
  Brain, Send, Check, Sparkles, MessageSquare, ChevronRight,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface TopicData {
  name: string;
  description: string;
  category: string;
  is_required: boolean;
  sample_questions: string[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  general: "Allgemein",
  nfr: "Non-Functional Requirements",
  security: "Security",
  architecture: "Architecture",
  data: "Data & Privacy",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  security: <Shield className="h-4 w-4" />,
  architecture: <Building className="h-4 w-4" />,
  compliance: <Settings2 className="h-4 w-4" />,
};

// ── AI Coach Chat Component ──
function InterviewCoachChat({
  editingTopic,
  onApply,
  onClose,
}: {
  editingTopic?: any;
  onApply: (topic: TopicData) => void;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastSuggestion, setLastSuggestion] = useState<TopicData | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Parse topic-json from assistant message
  const parseTopicJson = useCallback((content: string): TopicData | null => {
    const match = content.match(/```topic-json\s*([\s\S]*?)```/);
    if (!match) return null;
    try {
      return JSON.parse(match[1].trim());
    } catch {
      return null;
    }
  }, []);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isStreaming) return;

    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setIsStreaming(true);

    let assistantSoFar = "";

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coach-interview`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: allMessages,
            context: editingTopic ? { editingTopic } : {},
          }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Fehler" }));
        toast.error(err.error || `Fehler ${resp.status}`);
        setIsStreaming(false);
        return;
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Parse suggestion from final message
      const suggestion = parseTopicJson(assistantSoFar);
      if (suggestion) setLastSuggestion(suggestion);
    } catch (e) {
      console.error(e);
      toast.error("Chat-Fehler");
    } finally {
      setIsStreaming(false);
    }
  }, [input, messages, isStreaming, editingTopic, parseTopicJson]);

  // Clean markdown (remove topic-json blocks for display)
  const cleanContent = (content: string) => content.replace(/```topic-json[\s\S]*?```/g, "").trim();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <span className="font-medium text-sm">Interview Coach</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8 space-y-3">
            <Brain className="h-10 w-10 mx-auto text-muted-foreground/30" />
            <p>Beschreibe das Interview-Thema und ich helfe dir die besten Fragen zu finden.</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {["Hilf mir NFR-Fragen zu definieren", "Welche Security-Fragen sind wichtig?", "Erstelle Fragen für Data & Privacy"].map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(q); }}
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:bg-accent transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[85%] rounded-lg px-3 py-2 text-sm",
              msg.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground"
            )}>
              {msg.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{cleanContent(msg.content)}</ReactMarkdown>
                </div>
              ) : msg.content}
            </div>
          </div>
        ))}
        {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="bg-secondary rounded-lg px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Apply suggestion banner */}
      {lastSuggestion && (
        <div className="px-4 py-2 border-t border-border bg-primary/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-medium">Vorschlag: {lastSuggestion.name}</span>
              <Badge variant="outline" className="text-[10px]">{lastSuggestion.sample_questions.length} Fragen</Badge>
            </div>
            <Button size="sm" className="gap-1.5 h-7" onClick={() => { onApply(lastSuggestion); setLastSuggestion(null); }}>
              <Check className="h-3 w-3" /> Übernehmen
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-border">
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Beschreibe das Thema oder frage nach Fragen..."
            disabled={isStreaming}
            className="text-sm"
          />
          <Button type="submit" size="icon" disabled={!input.trim() || isStreaming} className="shrink-0">
            {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}

// ── Topic Editor (inline) ──
function TopicEditor({
  topic,
  onSave,
  onCancel,
  isPending,
}: {
  topic: any;
  onSave: (data: TopicData & { id: string }) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(topic.name);
  const [description, setDescription] = useState(topic.description || "");
  const [category, setCategory] = useState(topic.category);
  const [isRequired, setIsRequired] = useState(topic.is_required);
  const [questions, setQuestions] = useState((topic.sample_questions || []).join("\n"));

  return (
    <Card className="border-primary/30">
      <CardContent className="pt-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Kategorie</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Beschreibung</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="flex items-center space-x-2">
          <Switch checked={isRequired} onCheckedChange={setIsRequired} />
          <Label className="text-xs">Pflichtthema</Label>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Fragen (eine pro Zeile)</Label>
          <Textarea value={questions} onChange={(e) => setQuestions(e.target.value)} rows={5} className="text-sm" />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onCancel}>Abbrechen</Button>
          <Button size="sm" disabled={!name || isPending} onClick={() => onSave({
            id: topic.id,
            name,
            description,
            category,
            is_required: isRequired,
            sample_questions: questions.split("\n").filter((q) => q.trim()),
          })}>
            {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
            Speichern
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Page ──
export default function InterviewConfig() {
  const queryClient = useQueryClient();
  const [newTopicOpen, setNewTopicOpen] = useState(false);
  const [newGuidelineOpen, setNewGuidelineOpen] = useState(false);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachEditTopic, setCoachEditTopic] = useState<any | null>(null);

  // ── Queries ──
  const { data: topics, isLoading: topicsLoading } = useQuery({
    queryKey: ["interview-topics"],
    queryFn: async () => {
      const { data, error } = await supabase.from("interview_topics").select("*").order("category", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: guidelines, isLoading: guidelinesLoading } = useQuery({
    queryKey: ["guidelines"],
    queryFn: async () => {
      const { data, error } = await supabase.from("guidelines").select("*").order("type", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // ── Mutations ──
  const createTopic = useMutation({
    mutationFn: async (topic: TopicData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("interview_topics").insert({ ...topic, created_by: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Thema erstellt");
      queryClient.invalidateQueries({ queryKey: ["interview-topics"] });
      setNewTopicOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateTopic = useMutation({
    mutationFn: async (topic: TopicData & { id: string }) => {
      const { id, ...rest } = topic;
      const { error } = await supabase.from("interview_topics").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Thema aktualisiert");
      queryClient.invalidateQueries({ queryKey: ["interview-topics"] });
      setEditingTopicId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteTopic = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("interview_topics").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Thema gelöscht");
      queryClient.invalidateQueries({ queryKey: ["interview-topics"] });
    },
  });

  const createGuideline = useMutation({
    mutationFn: async (guideline: { type: string; name: string; description: string; content_markdown: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("guidelines").insert({ ...guideline, created_by: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Guideline erstellt");
      queryClient.invalidateQueries({ queryKey: ["guidelines"] });
      setNewGuidelineOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleGuideline = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("guidelines").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["guidelines"] }),
  });

  // Apply coach suggestion as new topic or update existing
  const handleApplyCoachSuggestion = useCallback((topicData: TopicData) => {
    if (coachEditTopic?.id) {
      updateTopic.mutate({ ...topicData, id: coachEditTopic.id });
    } else {
      createTopic.mutate(topicData);
    }
    toast.success("KI-Vorschlag übernommen");
  }, [coachEditTopic, updateTopic, createTopic]);

  // ── Forms ──
  const TopicForm = () => {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("general");
    const [isRequired, setIsRequired] = useState(false);
    const [questions, setQuestions] = useState("");

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="z.B. Non-Functional Requirements" />
        </div>
        <div className="space-y-2">
          <Label>Beschreibung</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Kurze Beschreibung" />
        </div>
        <div className="space-y-2">
          <Label>Kategorie</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <Switch checked={isRequired} onCheckedChange={setIsRequired} />
          <Label>Pflichtthema</Label>
        </div>
        <div className="space-y-2">
          <Label>Beispielfragen (eine pro Zeile)</Label>
          <Textarea value={questions} onChange={(e) => setQuestions(e.target.value)} placeholder="Welche Verfügbarkeitsanforderungen gibt es?&#10;Wie schnell muss das System reagieren?" rows={4} />
        </div>
        <Button
          onClick={() => createTopic.mutate({
            name, description, category, is_required: isRequired,
            sample_questions: questions.split("\n").filter((q) => q.trim()),
          })}
          disabled={!name || createTopic.isPending}
        >
          {createTopic.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Thema erstellen
        </Button>
      </div>
    );
  };

  const GuidelineForm = () => {
    const [type, setType] = useState("security");
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [content, setContent] = useState("");

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Typ</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="security">Security</SelectItem>
              <SelectItem value="architecture">Architecture</SelectItem>
              <SelectItem value="compliance">Compliance</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="z.B. OWASP Top 10" />
        </div>
        <div className="space-y-2">
          <Label>Beschreibung</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Kurze Beschreibung" />
        </div>
        <div className="space-y-2">
          <Label>Inhalt (Markdown)</Label>
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="## Guideline Details&#10;&#10;- Regel 1&#10;- Regel 2" rows={8} />
        </div>
        <Button
          onClick={() => createGuideline.mutate({ type, name, description, content_markdown: content })}
          disabled={!name || !content || createGuideline.isPending}
        >
          {createGuideline.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guideline erstellen
        </Button>
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Interview & Guidelines Konfiguration</h1>
            <p className="text-muted-foreground">
              Konfigurieren Sie Themen für das AI-Interview und Guidelines für die Software-Generierung
            </p>
          </div>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => { setCoachEditTopic(null); setCoachOpen(true); }}
          >
            <Brain className="h-4 w-4 text-primary" />
            KI Interview Coach
          </Button>
        </div>

        <Tabs defaultValue="topics">
          <TabsList>
            <TabsTrigger value="topics">Interview Themen</TabsTrigger>
            <TabsTrigger value="guidelines">Guidelines</TabsTrigger>
          </TabsList>

          <TabsContent value="topics" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Definieren Sie Themen, die die AI beim Interview abfragen soll
              </p>
              <Dialog open={newTopicOpen} onOpenChange={setNewTopicOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="mr-2 h-4 w-4" /> Neues Thema</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Neues Interview-Thema</DialogTitle></DialogHeader>
                  <TopicForm />
                </DialogContent>
              </Dialog>
            </div>

            {topicsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid gap-4">
                {topics?.map((topic) =>
                  editingTopicId === topic.id ? (
                    <TopicEditor
                      key={topic.id}
                      topic={topic}
                      onSave={(data) => updateTopic.mutate(data)}
                      onCancel={() => setEditingTopicId(null)}
                      isPending={updateTopic.isPending}
                    />
                  ) : (
                    <Card key={topic.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base">{topic.name}</CardTitle>
                            <Badge variant={topic.is_required ? "default" : "secondary"}>
                              {topic.is_required ? "Pflicht" : "Optional"}
                            </Badge>
                            <Badge variant="outline">{CATEGORY_LABELS[topic.category] || topic.category}</Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setCoachEditTopic(topic); setCoachOpen(true); }}
                              title="Mit KI Coach verbessern"
                            >
                              <Brain className="h-4 w-4 text-primary" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingTopicId(topic.id)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteTopic.mutate(topic.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        {topic.description && (
                          <CardDescription>{topic.description}</CardDescription>
                        )}
                      </CardHeader>
                      {topic.sample_questions && topic.sample_questions.length > 0 && (
                        <CardContent>
                          <p className="text-sm font-medium mb-2">Beispielfragen:</p>
                          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                            {topic.sample_questions.map((q: string, i: number) => (
                              <li key={i}>{q}</li>
                            ))}
                          </ul>
                        </CardContent>
                      )}
                    </Card>
                  )
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="guidelines" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Guidelines für Security, Architecture und Compliance
              </p>
              <Dialog open={newGuidelineOpen} onOpenChange={setNewGuidelineOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="mr-2 h-4 w-4" /> Neue Guideline</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader><DialogTitle>Neue Guideline</DialogTitle></DialogHeader>
                  <GuidelineForm />
                </DialogContent>
              </Dialog>
            </div>

            {guidelinesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid gap-4">
                {guidelines?.map((guideline) => (
                  <Card key={guideline.id} className={!guideline.is_active ? "opacity-60" : ""}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {TYPE_ICONS[guideline.type]}
                          <CardTitle className="text-base">{guideline.name}</CardTitle>
                          <Badge variant="outline">{guideline.type}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={guideline.is_active}
                            onCheckedChange={(checked) => toggleGuideline.mutate({ id: guideline.id, is_active: checked })}
                          />
                          <span className="text-xs text-muted-foreground">
                            {guideline.is_active ? "Aktiv" : "Inaktiv"}
                          </span>
                        </div>
                      </div>
                      {guideline.description && (
                        <CardDescription>{guideline.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-muted p-3 rounded-md whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {guideline.content_markdown}
                      </pre>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* AI Coach Sheet */}
      <Sheet open={coachOpen} onOpenChange={(v) => { if (!v) setCoachOpen(false); }}>
        <SheetContent className="sm:max-w-md w-full p-0" side="right">
          <InterviewCoachChat
            editingTopic={coachEditTopic}
            onApply={handleApplyCoachSuggestion}
            onClose={() => setCoachOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
