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
import { toast } from "sonner";
import {
  Plus, Trash2, Loader2, Settings2, Shield, Building, Pencil, X,
  Brain, Send, Check, Sparkles, BookOpen,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent,
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

interface RuleData {
  name: string;
  description: string;
  rule_type: string;
  content_markdown: string;
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

const RULE_TYPE_LABELS: Record<string, string> = {
  general: "Allgemein",
  conditional: "Bedingt",
  mandatory: "Pflicht-Check",
  quality: "Qualitätssicherung",
};

// ── AI Coach Chat (reusable for topics & rules) ──
function AiCoachChat({
  editingItem,
  mode,
  onApplyTopic,
  onApplyRule,
  onClose,
}: {
  editingItem?: any;
  mode: "topics" | "rules";
  onApplyTopic?: (topic: TopicData) => void;
  onApplyRule?: (rule: RuleData) => void;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastTopicSuggestion, setLastTopicSuggestion] = useState<TopicData | null>(null);
  const [lastRuleSuggestion, setLastRuleSuggestion] = useState<RuleData | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const parseTopicJson = useCallback((content: string): TopicData | null => {
    const match = content.match(/```topic-json\s*([\s\S]*?)```/);
    if (!match) return null;
    try { return JSON.parse(match[1].trim()); } catch { return null; }
  }, []);

  const parseRuleJson = useCallback((content: string): RuleData | null => {
    const match = content.match(/```rule-json\s*([\s\S]*?)```/);
    if (!match) return null;
    try { return JSON.parse(match[1].trim()); } catch { return null; }
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
      const functionName = mode === "topics" ? "coach-interview" : "coach-interview-rules";
      const contextPayload = mode === "topics"
        ? (editingItem ? { editingTopic: editingItem } : {})
        : (editingItem ? { editingRule: editingItem } : {});

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ messages: allMessages, context: contextPayload }),
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

      if (mode === "topics") {
        const s = parseTopicJson(assistantSoFar);
        if (s) setLastTopicSuggestion(s);
      } else {
        const s = parseRuleJson(assistantSoFar);
        if (s) setLastRuleSuggestion(s);
      }
    } catch (e) {
      console.error(e);
      toast.error("Chat-Fehler");
    } finally {
      setIsStreaming(false);
    }
  }, [input, messages, isStreaming, editingItem, mode, parseTopicJson, parseRuleJson]);

  const cleanContent = (content: string) =>
    content.replace(/```topic-json[\s\S]*?```/g, "").replace(/```rule-json[\s\S]*?```/g, "").trim();

  const isTopic = mode === "topics";
  const title = isTopic ? "Interview Coach" : "Regeln Coach";
  const placeholder = isTopic ? "Beschreibe das Thema oder frage nach Fragen..." : "Beschreibe die Regel oder frage nach Vorschlägen...";
  const quickStarters = isTopic
    ? ["Hilf mir NFR-Fragen zu definieren", "Welche Security-Fragen sind wichtig?", "Erstelle Fragen für Data & Privacy"]
    : ["Welche Interview-Regeln brauche ich?", "Regel für Budget-Fragen erstellen", "Bedingte Regel für Cloud-Projekte"];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <span className="font-medium text-sm">{title}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8 space-y-3">
            <Brain className="h-10 w-10 mx-auto text-muted-foreground/30" />
            <p>{isTopic ? "Beschreibe das Interview-Thema und ich helfe dir die besten Fragen zu finden." : "Beschreibe die Interview-Regel und ich helfe dir sie zu definieren."}</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {quickStarters.map((q) => (
                <button key={q} onClick={() => setInput(q)} className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:bg-accent transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[85%] rounded-lg px-3 py-2 text-sm", msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground")}>
              {msg.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown>{cleanContent(msg.content)}</ReactMarkdown></div>
              ) : msg.content}
            </div>
          </div>
        ))}
        {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="bg-secondary rounded-lg px-3 py-2"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          </div>
        )}
      </div>

      {lastTopicSuggestion && isTopic && (
        <div className="px-4 py-2 border-t border-border bg-primary/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-medium">Vorschlag: {lastTopicSuggestion.name}</span>
              <Badge variant="outline" className="text-[10px]">{lastTopicSuggestion.sample_questions.length} Fragen</Badge>
            </div>
            <Button size="sm" className="gap-1.5 h-7" onClick={() => { onApplyTopic?.(lastTopicSuggestion); setLastTopicSuggestion(null); }}>
              <Check className="h-3 w-3" /> Übernehmen
            </Button>
          </div>
        </div>
      )}
      {lastRuleSuggestion && !isTopic && (
        <div className="px-4 py-2 border-t border-border bg-primary/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-medium">Vorschlag: {lastRuleSuggestion.name}</span>
              <Badge variant="outline" className="text-[10px]">{RULE_TYPE_LABELS[lastRuleSuggestion.rule_type] || lastRuleSuggestion.rule_type}</Badge>
            </div>
            <Button size="sm" className="gap-1.5 h-7" onClick={() => { onApplyRule?.(lastRuleSuggestion); setLastRuleSuggestion(null); }}>
              <Check className="h-3 w-3" /> Übernehmen
            </Button>
          </div>
        </div>
      )}

      <div className="p-3 border-t border-border">
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder={placeholder} disabled={isStreaming} className="text-sm" />
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
            id: topic.id, name, description, category, is_required: isRequired,
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

// ── Rule Editor (inline) ──
function RuleEditor({
  rule,
  onSave,
  onCancel,
  isPending,
}: {
  rule: any;
  onSave: (data: RuleData & { id: string }) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(rule.name);
  const [description, setDescription] = useState(rule.description || "");
  const [ruleType, setRuleType] = useState(rule.rule_type);
  const [content, setContent] = useState(rule.content_markdown || "");

  return (
    <Card className="border-primary/30">
      <CardContent className="pt-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Typ</Label>
            <Select value={ruleType} onValueChange={setRuleType}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(RULE_TYPE_LABELS).map(([k, v]) => (
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
        <div className="space-y-1">
          <Label className="text-xs">Inhalt (Markdown)</Label>
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} className="text-sm" />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onCancel}>Abbrechen</Button>
          <Button size="sm" disabled={!name || !content || isPending} onClick={() => onSave({
            id: rule.id, name, description, rule_type: ruleType, content_markdown: content,
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
  const [newRuleOpen, setNewRuleOpen] = useState(false);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachMode, setCoachMode] = useState<"topics" | "rules">("topics");
  const [coachEditItem, setCoachEditItem] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState("topics");

  // ── Queries ──
  const { data: topics, isLoading: topicsLoading } = useQuery({
    queryKey: ["interview-topics"],
    queryFn: async () => {
      const { data, error } = await supabase.from("interview_topics").select("*").order("category", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: rules, isLoading: rulesLoading } = useQuery({
    queryKey: ["interview-rules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("interview_rules" as any).select("*").order("rule_type", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  // ── Topic Mutations ──
  const createTopic = useMutation({
    mutationFn: async (topic: TopicData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("interview_topics").insert({ ...topic, created_by: user.id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Thema erstellt"); queryClient.invalidateQueries({ queryKey: ["interview-topics"] }); setNewTopicOpen(false); },
    onError: (e) => toast.error(e.message),
  });

  const updateTopic = useMutation({
    mutationFn: async (topic: TopicData & { id: string }) => {
      const { id, ...rest } = topic;
      const { error } = await supabase.from("interview_topics").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Thema aktualisiert"); queryClient.invalidateQueries({ queryKey: ["interview-topics"] }); setEditingTopicId(null); },
    onError: (e) => toast.error(e.message),
  });

  const deleteTopic = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("interview_topics").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Thema gelöscht"); queryClient.invalidateQueries({ queryKey: ["interview-topics"] }); },
  });

  // ── Rule Mutations ──
  const createRule = useMutation({
    mutationFn: async (rule: RuleData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("interview_rules" as any).insert({ ...rule, created_by: user.id } as any);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Regel erstellt"); queryClient.invalidateQueries({ queryKey: ["interview-rules"] }); setNewRuleOpen(false); },
    onError: (e) => toast.error(e.message),
  });

  const updateRule = useMutation({
    mutationFn: async (rule: RuleData & { id: string }) => {
      const { id, ...rest } = rule;
      const { error } = await supabase.from("interview_rules" as any).update(rest as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Regel aktualisiert"); queryClient.invalidateQueries({ queryKey: ["interview-rules"] }); setEditingRuleId(null); },
    onError: (e) => toast.error(e.message),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("interview_rules" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Regel gelöscht"); queryClient.invalidateQueries({ queryKey: ["interview-rules"] }); },
  });

  const toggleRule = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("interview_rules" as any).update({ is_active } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["interview-rules"] }),
  });

  // Apply coach suggestions
  const handleApplyTopicSuggestion = useCallback((topicData: TopicData) => {
    if (coachEditItem?.id && coachMode === "topics") {
      updateTopic.mutate({ ...topicData, id: coachEditItem.id });
    } else {
      createTopic.mutate(topicData);
    }
    toast.success("KI-Vorschlag übernommen");
  }, [coachEditItem, coachMode, updateTopic, createTopic]);

  const handleApplyRuleSuggestion = useCallback((ruleData: RuleData) => {
    if (coachEditItem?.id && coachMode === "rules") {
      updateRule.mutate({ ...ruleData, id: coachEditItem.id });
    } else {
      createRule.mutate(ruleData);
    }
    toast.success("KI-Vorschlag übernommen");
  }, [coachEditItem, coachMode, updateRule, createRule]);

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
        <Button onClick={() => createTopic.mutate({ name, description, category, is_required: isRequired, sample_questions: questions.split("\n").filter((q) => q.trim()) })} disabled={!name || createTopic.isPending}>
          {createTopic.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Thema erstellen
        </Button>
      </div>
    );
  };

  const RuleForm = () => {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [ruleType, setRuleType] = useState("general");
    const [content, setContent] = useState("");

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Typ</Label>
          <Select value={ruleType} onValueChange={setRuleType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(RULE_TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="z.B. Immer nach Budget fragen" />
        </div>
        <div className="space-y-2">
          <Label>Beschreibung</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Kurze Beschreibung" />
        </div>
        <div className="space-y-2">
          <Label>Inhalt (Markdown)</Label>
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="## Regel&#10;&#10;Bei jedem Intake muss nach dem verfügbaren Budget gefragt werden..." rows={8} />
        </div>
        <Button onClick={() => createRule.mutate({ name, description, rule_type: ruleType, content_markdown: content })} disabled={!name || !content || createRule.isPending}>
          {createRule.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Regel erstellen
        </Button>
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Interview & Regeln Konfiguration</h1>
            <p className="text-muted-foreground">
              Konfigurieren Sie Interview-Themen und operative Regeln für den KI-Interviewer
            </p>
          </div>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => { setCoachEditItem(null); setCoachMode(activeTab === "rules" ? "rules" : "topics"); setCoachOpen(true); }}
          >
            <Brain className="h-4 w-4 text-primary" />
            KI Coach
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="topics">Interview Themen</TabsTrigger>
            <TabsTrigger value="rules">Interview-Regeln</TabsTrigger>
          </TabsList>

          {/* ── Topics Tab ── */}
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
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="grid gap-4">
                {topics?.map((topic) =>
                  editingTopicId === topic.id ? (
                    <TopicEditor key={topic.id} topic={topic} onSave={(data) => updateTopic.mutate(data)} onCancel={() => setEditingTopicId(null)} isPending={updateTopic.isPending} />
                  ) : (
                    <Card key={topic.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base">{topic.name}</CardTitle>
                            <Badge variant={topic.is_required ? "default" : "secondary"}>{topic.is_required ? "Pflicht" : "Optional"}</Badge>
                            <Badge variant="outline">{CATEGORY_LABELS[topic.category] || topic.category}</Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => { setCoachEditItem(topic); setCoachMode("topics"); setCoachOpen(true); }} title="Mit KI Coach verbessern">
                              <Brain className="h-4 w-4 text-primary" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setEditingTopicId(topic.id)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteTopic.mutate(topic.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        {topic.description && <CardDescription>{topic.description}</CardDescription>}
                      </CardHeader>
                      {topic.sample_questions && topic.sample_questions.length > 0 && (
                        <CardContent>
                          <p className="text-sm font-medium mb-2">Beispielfragen:</p>
                          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                            {topic.sample_questions.map((q: string, i: number) => (<li key={i}>{q}</li>))}
                          </ul>
                        </CardContent>
                      )}
                    </Card>
                  )
                )}
              </div>
            )}
          </TabsContent>

          {/* ── Rules Tab ── */}
          <TabsContent value="rules" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Operative Regeln, die der KI-Interviewer beim Intake-Gespräch befolgen soll
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="gap-2" onClick={() => { setCoachEditItem(null); setCoachMode("rules"); setCoachOpen(true); }}>
                  <Brain className="h-4 w-4 text-primary" /> KI erstellen lassen
                </Button>
                <Dialog open={newRuleOpen} onOpenChange={setNewRuleOpen}>
                  <DialogTrigger asChild>
                    <Button><Plus className="mr-2 h-4 w-4" /> Neue Regel</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader><DialogTitle>Neue Interview-Regel</DialogTitle></DialogHeader>
                    <RuleForm />
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {rulesLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : rules && rules.length > 0 ? (
              <div className="grid gap-4">
                {rules.map((rule: any) =>
                  editingRuleId === rule.id ? (
                    <RuleEditor key={rule.id} rule={rule} onSave={(data) => updateRule.mutate(data)} onCancel={() => setEditingRuleId(null)} isPending={updateRule.isPending} />
                  ) : (
                    <Card key={rule.id} className={!rule.is_active ? "opacity-60" : ""}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            <CardTitle className="text-base">{rule.name}</CardTitle>
                            <Badge variant="outline">{RULE_TYPE_LABELS[rule.rule_type] || rule.rule_type}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => { setCoachEditItem(rule); setCoachMode("rules"); setCoachOpen(true); }} title="Mit KI Coach verbessern">
                              <Brain className="h-4 w-4 text-primary" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setEditingRuleId(rule.id)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteRule.mutate(rule.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                            <Switch checked={rule.is_active} onCheckedChange={(checked) => toggleRule.mutate({ id: rule.id, is_active: checked })} />
                            <span className="text-xs text-muted-foreground">{rule.is_active ? "Aktiv" : "Inaktiv"}</span>
                          </div>
                        </div>
                        {rule.description && <CardDescription>{rule.description}</CardDescription>}
                      </CardHeader>
                      <CardContent>
                        <div className="prose prose-sm dark:prose-invert max-w-none bg-muted p-3 rounded-md max-h-32 overflow-y-auto">
                          <ReactMarkdown>{rule.content_markdown}</ReactMarkdown>
                        </div>
                      </CardContent>
                    </Card>
                  )
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground mb-4">Noch keine Interview-Regeln definiert.</p>
                  <Button variant="outline" className="gap-2" onClick={() => { setCoachEditItem(null); setCoachMode("rules"); setCoachOpen(true); }}>
                    <Brain className="h-4 w-4 text-primary" /> Mit KI Coach erstellen
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* AI Coach Sheet */}
      <Sheet open={coachOpen} onOpenChange={(v) => { if (!v) setCoachOpen(false); }}>
        <SheetContent className="sm:max-w-md w-full p-0" side="right">
          <AiCoachChat
            editingItem={coachEditItem}
            mode={coachMode}
            onApplyTopic={handleApplyTopicSuggestion}
            onApplyRule={handleApplyRuleSuggestion}
            onClose={() => setCoachOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
