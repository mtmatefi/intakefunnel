import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { MessageSquarePlus, Copy, Check, Sparkles, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FollowupDialogProps {
  intakeId: string;
  intakeTitle: string;
  requesterEmail?: string;
}

export function FollowupDialog({ intakeId, intakeTitle, requesterEmail }: FollowupDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [customQuestions, setCustomQuestions] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const queryClient = useQueryClient();

  // Fetch interview topics for predefined questions
  const { data: topics } = useQuery({
    queryKey: ["interview-topics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interview_topics")
        .select("*")
        .order("category");
      if (error) throw error;
      return data;
    },
  });

  // Create followup request mutation
  const createFollowup = useMutation({
    mutationFn: async () => {
      const allQuestions = [
        ...selectedQuestions,
        ...customQuestions.split("\n").filter(q => q.trim()),
      ];
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("followup_requests")
        .insert({
          intake_id: intakeId,
          requested_by: user.id,
          questions: allQuestions,
          message: message,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Erfolg", description: "Follow-up Anfrage erstellt" });
      queryClient.invalidateQueries({ queryKey: ["followup-requests", intakeId] });
    },
    onError: (error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  // Generate questions with AI
  const handleGenerateQuestions = async () => {
    setGenerating(true);
    try {
      const response = await supabase.functions.invoke("generate-followup-questions", {
        body: { intakeId },
      });
      
      if (response.data?.questions) {
        setCustomQuestions(response.data.questions.join("\n"));
        toast({ title: "Fragen generiert", description: "AI hat Fragen basierend auf dem Transcript erstellt" });
      }
    } catch (error) {
      console.error("Failed to generate questions:", error);
      toast({ title: "Fehler", description: "Konnte keine Fragen generieren", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const allQuestions = [
    ...selectedQuestions,
    ...customQuestions.split("\n").filter(q => q.trim()),
  ];

  const baseUrl = window.location.origin;
  const followupLink = `${baseUrl}/intake/${intakeId}?followup=true`;

  const emailText = `Betreff: Weitere Informationen benötigt - ${intakeTitle}

Guten Tag,

zu Ihrem Intake-Antrag "${intakeTitle}" benötigen wir noch einige zusätzliche Informationen:

${allQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

${message ? `\nHinweis: ${message}\n` : ""}

Bitte beantworten Sie diese Fragen unter folgendem Link:
${followupLink}

Mit freundlichen Grüßen,
Ihr Architecture Team`;

  const handleCopy = () => {
    navigator.clipboard.writeText(emailText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Kopiert!", description: "Email-Text wurde in die Zwischenablage kopiert" });
  };

  const toggleQuestion = (question: string) => {
    setSelectedQuestions(prev =>
      prev.includes(question)
        ? prev.filter(q => q !== question)
        : [...prev, question]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <MessageSquarePlus className="mr-2 h-4 w-4" />
          Follow-up anfordern
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Follow-up Fragen anfordern</DialogTitle>
          <DialogDescription>
            Wählen Sie Fragen aus oder generieren Sie neue mit AI. Der User erhält einen Link zur Beantwortung.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Predefined Questions */}
          {topics && topics.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Vordefinierte Fragen</h4>
              {topics.map((topic) => (
                <div key={topic.id} className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{topic.name}</p>
                  {topic.sample_questions?.map((q: string, i: number) => (
                    <div key={i} className="flex items-center space-x-2">
                      <Checkbox
                        id={`q-${topic.id}-${i}`}
                        checked={selectedQuestions.includes(q)}
                        onCheckedChange={() => toggleQuestion(q)}
                      />
                      <Label htmlFor={`q-${topic.id}-${i}`} className="text-sm cursor-pointer">
                        {q}
                      </Label>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* AI Generated Questions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Eigene Fragen</h4>
              <Button variant="outline" size="sm" onClick={handleGenerateQuestions} disabled={generating}>
                {generating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Mit AI generieren
              </Button>
            </div>
            <Textarea
              placeholder="Eine Frage pro Zeile..."
              value={customQuestions}
              onChange={(e) => setCustomQuestions(e.target.value)}
              rows={4}
            />
          </div>

          {/* Additional Message */}
          <div className="space-y-2">
            <Label>Zusätzliche Nachricht (optional)</Label>
            <Textarea
              placeholder="Optionaler Kontext für den User..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
            />
          </div>

          {/* Email Preview */}
          {allQuestions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  Email-Vorlage (für Outlook)
                  <Button variant="ghost" size="sm" onClick={handleCopy}>
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs whitespace-pre-wrap bg-muted p-3 rounded-md max-h-48 overflow-y-auto">
                  {emailText}
                </pre>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={() => {
                createFollowup.mutate();
                handleCopy();
              }}
              disabled={allQuestions.length === 0 || createFollowup.isPending}
            >
              {createFollowup.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              Speichern & Kopieren
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
