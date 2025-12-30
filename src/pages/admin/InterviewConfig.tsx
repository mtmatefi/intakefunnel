import { useState } from "react";
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
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Save, Loader2, Settings2, Shield, Building } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function InterviewConfig() {
  const queryClient = useQueryClient();
  const [newTopicOpen, setNewTopicOpen] = useState(false);
  const [newGuidelineOpen, setNewGuidelineOpen] = useState(false);

  // Fetch interview topics
  const { data: topics, isLoading: topicsLoading } = useQuery({
    queryKey: ["interview-topics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interview_topics")
        .select("*")
        .order("category", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch guidelines
  const { data: guidelines, isLoading: guidelinesLoading } = useQuery({
    queryKey: ["guidelines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guidelines")
        .select("*")
        .order("type", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Create topic mutation
  const createTopic = useMutation({
    mutationFn: async (topic: {
      name: string;
      description: string;
      category: string;
      is_required: boolean;
      sample_questions: string[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("interview_topics").insert({
        ...topic,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Erfolg", description: "Thema erstellt" });
      queryClient.invalidateQueries({ queryKey: ["interview-topics"] });
      setNewTopicOpen(false);
    },
    onError: (error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  // Create guideline mutation
  const createGuideline = useMutation({
    mutationFn: async (guideline: {
      type: string;
      name: string;
      description: string;
      content_markdown: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("guidelines").insert({
        ...guideline,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Erfolg", description: "Guideline erstellt" });
      queryClient.invalidateQueries({ queryKey: ["guidelines"] });
      setNewGuidelineOpen(false);
    },
    onError: (error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  // Delete topic mutation
  const deleteTopic = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("interview_topics").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Gelöscht" });
      queryClient.invalidateQueries({ queryKey: ["interview-topics"] });
    },
  });

  // Toggle guideline active mutation
  const toggleGuideline = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("guidelines")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guidelines"] });
    },
  });

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
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">Allgemein</SelectItem>
              <SelectItem value="nfr">Non-Functional Requirements</SelectItem>
              <SelectItem value="security">Security</SelectItem>
              <SelectItem value="architecture">Architecture</SelectItem>
              <SelectItem value="data">Data & Privacy</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <Switch checked={isRequired} onCheckedChange={setIsRequired} />
          <Label>Pflichtthema (AI wird immer danach fragen)</Label>
        </div>
        <div className="space-y-2">
          <Label>Beispielfragen (eine pro Zeile)</Label>
          <Textarea
            value={questions}
            onChange={(e) => setQuestions(e.target.value)}
            placeholder="Welche Verfügbarkeitsanforderungen gibt es?&#10;Wie schnell muss das System reagieren?"
            rows={4}
          />
        </div>
        <Button
          onClick={() => createTopic.mutate({
            name,
            description,
            category,
            is_required: isRequired,
            sample_questions: questions.split("\n").filter(q => q.trim()),
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
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
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
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="## Guideline Details&#10;&#10;- Regel 1&#10;- Regel 2"
            rows={8}
          />
        </div>
        <Button
          onClick={() => createGuideline.mutate({
            type,
            name,
            description,
            content_markdown: content,
          })}
          disabled={!name || !content || createGuideline.isPending}
        >
          {createGuideline.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guideline erstellen
        </Button>
      </div>
    );
  };

  const categoryLabels: Record<string, string> = {
    general: "Allgemein",
    nfr: "Non-Functional Requirements",
    security: "Security",
    architecture: "Architecture",
    data: "Data & Privacy",
  };

  const typeIcons: Record<string, React.ReactNode> = {
    security: <Shield className="h-4 w-4" />,
    architecture: <Building className="h-4 w-4" />,
    compliance: <Settings2 className="h-4 w-4" />,
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Interview & Guidelines Konfiguration</h1>
          <p className="text-muted-foreground">
            Konfigurieren Sie Themen für das AI-Interview und Guidelines für die Software-Generierung
          </p>
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
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Neues Thema
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Neues Interview-Thema</DialogTitle>
                  </DialogHeader>
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
                {topics?.map((topic) => (
                  <Card key={topic.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{topic.name}</CardTitle>
                          <Badge variant={topic.is_required ? "default" : "secondary"}>
                            {topic.is_required ? "Pflicht" : "Optional"}
                          </Badge>
                          <Badge variant="outline">{categoryLabels[topic.category] || topic.category}</Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteTopic.mutate(topic.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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
                ))}
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
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Neue Guideline
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Neue Guideline</DialogTitle>
                  </DialogHeader>
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
                          {typeIcons[guideline.type]}
                          <CardTitle className="text-base">{guideline.name}</CardTitle>
                          <Badge variant="outline">{guideline.type}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={guideline.is_active}
                            onCheckedChange={(checked) => 
                              toggleGuideline.mutate({ id: guideline.id, is_active: checked })
                            }
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
    </AppLayout>
  );
}
