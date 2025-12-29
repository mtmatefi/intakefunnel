import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { interviewQuestions, categoryLabels } from '@/data/demo';
import type { InterviewQuestion, TranscriptMessage } from '@/types/intake';
import { cn } from '@/lib/utils';
import { 
  Send, 
  ArrowRight, 
  Loader2, 
  MessageSquare,
  FileText,
  CheckCircle,
  AlertCircle,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const categories = ['problem', 'users', 'data', 'integrations', 'ux', 'nfr'] as const;

interface AIValidation {
  isComplete: boolean;
  quality: 'excellent' | 'good' | 'needs_improvement' | 'insufficient';
  followUpQuestion: string | null;
  suggestions: string[];
  enrichedAnswer: string | null;
  missingAspects: string[];
}

export function IntakeWizard() {
  const navigate = useNavigate();
  const [currentCategory, setCurrentCategory] = useState<string>('problem');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [enrichedAnswers, setEnrichedAnswers] = useState<Record<string, string>>({});
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [pendingFollowUp, setPendingFollowUp] = useState<string | null>(null);
  const [currentValidation, setCurrentValidation] = useState<AIValidation | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const categoryQuestions = interviewQuestions.filter(q => q.category === currentCategory);
  const currentQuestion = categoryQuestions[currentQuestionIndex];
  
  const totalQuestions = interviewQuestions.length;
  const answeredQuestions = Object.keys(answers).length;
  const progress = (answeredQuestions / totalQuestions) * 100;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  useEffect(() => {
    // Add initial assistant message when category changes
    if (currentQuestion && !transcript.find(t => t.questionKey === currentQuestion.key)) {
      const categoryIntro = currentQuestionIndex === 0 ? 
        `Gut, lassen Sie uns über ${categoryLabels[currentCategory].toLowerCase()} sprechen. ` : '';
      
      setTranscript(prev => [...prev, {
        id: `msg-${Date.now()}`,
        intakeId: 'new',
        speaker: 'assistant',
        message: `${categoryIntro}${currentQuestion.question}${currentQuestion.helpText ? `\n\n💡 ${currentQuestion.helpText}` : ''}`,
        timestamp: new Date().toISOString(),
        questionKey: currentQuestion.key,
      }]);
    }
  }, [currentCategory, currentQuestionIndex, currentQuestion]);

  const validateWithAI = async (questionKey: string, questionText: string, answer: string) => {
    setIsValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-intake', {
        body: {
          questionKey,
          questionText,
          userAnswer: answer,
          category: currentCategory,
          previousAnswers: answers
        }
      });

      if (error) {
        console.error('Validation error:', error);
        return null;
      }

      return data as AIValidation;
    } catch (err) {
      console.error('Failed to validate:', err);
      return null;
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!inputValue.trim() || !currentQuestion) return;

    const userMessage = inputValue;
    
    // Add user message to transcript
    setTranscript(prev => [...prev, {
      id: `msg-${Date.now()}`,
      intakeId: 'new',
      speaker: 'user',
      message: userMessage,
      timestamp: new Date().toISOString(),
    }]);

    setInputValue('');
    setIsProcessing(true);

    // If this is answering a follow-up question, combine with previous answer
    const combinedAnswer = pendingFollowUp 
      ? `${answers[currentQuestion.key] || ''}\n\nErgänzung: ${userMessage}`
      : userMessage;

    // Validate with AI
    const validation = await validateWithAI(
      currentQuestion.key, 
      pendingFollowUp || currentQuestion.question,
      combinedAnswer
    );

    setCurrentValidation(validation);

    if (validation?.followUpQuestion && !pendingFollowUp) {
      // AI wants to ask a follow-up question
      setPendingFollowUp(validation.followUpQuestion);
      setIsProcessing(false);
      
      // Show AI follow-up question
      setTranscript(prev => [...prev, {
        id: `msg-${Date.now()}`,
        intakeId: 'new',
        speaker: 'assistant',
        message: `🤔 ${validation.followUpQuestion}${validation.suggestions?.length > 0 ? `\n\n💡 Tipp: ${validation.suggestions[0]}` : ''}`,
        timestamp: new Date().toISOString(),
      }]);
      
      // Save partial answer
      setAnswers(prev => ({ ...prev, [currentQuestion.key]: combinedAnswer }));
      return;
    }

    // Clear follow-up state
    setPendingFollowUp(null);

    // Save answer (enriched if available)
    const finalAnswer = validation?.enrichedAnswer || combinedAnswer;
    setAnswers(prev => ({ ...prev, [currentQuestion.key]: combinedAnswer }));
    if (validation?.enrichedAnswer) {
      setEnrichedAnswers(prev => ({ ...prev, [currentQuestion.key]: validation.enrichedAnswer! }));
    }

    // Show quality feedback if available
    if (validation) {
      const qualityEmoji = {
        excellent: '✨',
        good: '✓',
        needs_improvement: '📝',
        insufficient: '⚠️'
      }[validation.quality];
      
      const qualityMessages = {
        excellent: 'Ausgezeichnet, sehr detailliert!',
        good: 'Gut erfasst.',
        needs_improvement: 'Okay, ich habe die wichtigsten Punkte.',
        insufficient: 'Verstanden, wir können das später ergänzen.'
      };

      // Add quality feedback
      setTranscript(prev => [...prev, {
        id: `msg-${Date.now()}-feedback`,
        intakeId: 'new',
        speaker: 'assistant',
        message: `${qualityEmoji} ${qualityMessages[validation.quality]}`,
        timestamp: new Date().toISOString(),
      }]);
    }

    setIsProcessing(false);

    // Move to next question after a short delay
    setTimeout(() => {
      if (currentQuestionIndex < categoryQuestions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        // Move to next category
        const categoryIndex = categories.indexOf(currentCategory as typeof categories[number]);
        if (categoryIndex < categories.length - 1) {
          setCurrentCategory(categories[categoryIndex + 1]);
          setCurrentQuestionIndex(0);
        } else {
          // All done - show completion message
          setTranscript(prev => [...prev, {
            id: `msg-${Date.now()}`,
            intakeId: 'new',
            speaker: 'assistant',
            message: '✅ Ausgezeichnet! Ich habe alle Informationen, die ich brauche. Ich werde jetzt eine strukturierte Spezifikation und Routing-Empfehlung für Ihre Überprüfung generieren.',
            timestamp: new Date().toISOString(),
          }]);
        }
      }
    }, 800);
  };

  const handleSelectAnswer = (value: string) => {
    setInputValue(value);
  };

  const handleSkipFollowUp = () => {
    if (!currentQuestion) return;
    
    setPendingFollowUp(null);
    setCurrentValidation(null);
    
    // Add skip message
    setTranscript(prev => [...prev, {
      id: `msg-${Date.now()}`,
      intakeId: 'new',
      speaker: 'user',
      message: '[Übersprungen]',
      timestamp: new Date().toISOString(),
    }]);

    // Move to next question
    setTimeout(() => {
      if (currentQuestionIndex < categoryQuestions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        const categoryIndex = categories.indexOf(currentCategory as typeof categories[number]);
        if (categoryIndex < categories.length - 1) {
          setCurrentCategory(categories[categoryIndex + 1]);
          setCurrentQuestionIndex(0);
        }
      }
    }, 300);
  };

  const isComplete = answeredQuestions >= totalQuestions;

  const handleGenerateSpec = async () => {
    toast.loading('Generiere Spezifikation mit AI...', { id: 'gen-spec' });
    
    try {
      // In production: Create intake, save transcript, generate spec
      // For now, navigate to demo
      toast.success('Spezifikation erfolgreich generiert!', { id: 'gen-spec' });
      navigate('/intake/intake-1');
    } catch (error) {
      toast.error('Fehler bei der Generierung', { id: 'gen-spec' });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Progress Sidebar */}
      <div className="lg:col-span-1 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Interview Fortschritt</CardTitle>
            <CardDescription>{answeredQuestions} von {totalQuestions} Fragen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progress} className="h-2" />
            
            <div className="space-y-2">
              {categories.map((cat, index) => {
                const catQuestions = interviewQuestions.filter(q => q.category === cat);
                const catAnswered = catQuestions.filter(q => answers[q.key]).length;
                const isActive = currentCategory === cat;
                const isCatComplete = catAnswered === catQuestions.length;
                
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setCurrentCategory(cat);
                      setCurrentQuestionIndex(0);
                      setPendingFollowUp(null);
                    }}
                    className={cn(
                      'w-full flex items-center justify-between p-2 text-left transition-colors rounded-md',
                      isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50',
                      isCatComplete && 'text-success'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'w-6 h-6 flex items-center justify-center text-xs font-medium rounded',
                        isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                        isCatComplete && 'bg-success text-success-foreground'
                      )}>
                        {isCatComplete ? <CheckCircle className="h-4 w-4" /> : index + 1}
                      </span>
                      <span className="text-sm font-medium">{categoryLabels[cat]}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {catAnswered}/{catQuestions.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* AI Assistant Info */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">AI-Assistent aktiv</p>
                <p className="text-xs text-muted-foreground">
                  Die AI prüft Ihre Antworten und stellt bei Bedarf Nachfragen für bessere Spezifikationen.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {isComplete && (
          <Card className="border-success">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 text-success">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Interview Abgeschlossen</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Bereit zur Generierung Ihrer Spezifikation und Routing-Empfehlung.
              </p>
              <Button onClick={handleGenerateSpec} className="w-full">
                <FileText className="mr-2 h-4 w-4" />
                Spezifikation Generieren
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Chat Interface */}
      <div className="lg:col-span-2">
        <Card className="h-[600px] flex flex-col">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Intake Interview</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {isValidating && (
                  <Badge variant="outline" className="gap-1">
                    <Sparkles className="h-3 w-3 animate-pulse" />
                    AI prüft...
                  </Badge>
                )}
                <Badge variant="outline">{categoryLabels[currentCategory]}</Badge>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {transcript.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Starte Ihr Intake-Interview...</p>
              </div>
            )}
            
            {transcript.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex',
                  msg.speaker === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[80%] p-3 text-sm whitespace-pre-wrap rounded-lg',
                    msg.speaker === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  )}
                >
                  {msg.message}
                </div>
              </div>
            ))}
            
            {(isProcessing || isValidating) && (
              <div className="flex justify-start">
                <div className="bg-muted p-3 rounded-lg flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">
                    {isValidating ? 'AI analysiert...' : 'Verarbeite...'}
                  </span>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </CardContent>

          {/* Input Area */}
          <div className="p-4 border-t border-border space-y-3">
            {pendingFollowUp && (
              <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <HelpCircle className="h-4 w-4" />
                  <span>Nachfrage - Sie können antworten oder überspringen</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleSkipFollowUp}>
                  Überspringen
                </Button>
              </div>
            )}
            
            {currentQuestion?.inputType === 'select' && currentQuestion.options && !pendingFollowUp && (
              <div className="flex flex-wrap gap-2">
                {currentQuestion.options.map((option) => (
                  <Button
                    key={option}
                    variant={inputValue === option ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleSelectAnswer(option)}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            )}
            
            <div className="flex gap-2">
              {(currentQuestion?.inputType === 'textarea' || pendingFollowUp) ? (
                <Textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={pendingFollowUp ? "Ihre Ergänzung..." : "Ihre Antwort eingeben..."}
                  className="min-h-[80px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmitAnswer();
                    }
                  }}
                />
              ) : (
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ihre Antwort eingeben..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSubmitAnswer();
                    }
                  }}
                />
              )}
              <Button 
                onClick={handleSubmitAnswer} 
                disabled={!inputValue.trim() || isProcessing || isValidating}
                size="icon"
                className="flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
