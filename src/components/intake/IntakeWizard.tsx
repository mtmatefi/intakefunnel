import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { interviewQuestions } from '@/data/demo';
import type { InterviewQuestion, TranscriptMessage } from '@/types/intake';
import { cn } from '@/lib/utils';
import { 
  Send, 
  Loader2, 
  MessageSquare,
  FileText,
  CheckCircle,
  Sparkles,
  HelpCircle,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const { language, t } = useLanguage();
  const { saveState, loadState, clearState, hasSavedState } = useAutoSave();
  
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
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const hasRestoredRef = useRef(false);

  // Voice chat integration
  const handleVoiceTranscript = useCallback((text: string) => {
    setInputValue(prev => prev + (prev ? ' ' : '') + text);
  }, []);

  const { 
    isListening, 
    isSpeaking, 
    isSupported: voiceSupported,
    startListening, 
    stopListening, 
    speak, 
    stopSpeaking 
  } = useVoiceChat({
    language,
    onTranscript: handleVoiceTranscript,
  });

  const categoryQuestions = interviewQuestions.filter(q => q.category === currentCategory);
  const currentQuestion = categoryQuestions[currentQuestionIndex];
  
  const totalQuestions = interviewQuestions.length;
  const answeredQuestions = Object.keys(answers).length;
  const progress = (answeredQuestions / totalQuestions) * 100;

  // Get translated question text
  const getQuestionText = (q: InterviewQuestion) => {
    return t(`q.${q.key}`) !== `q.${q.key}` ? t(`q.${q.key}`) : q.question;
  };

  const getHelpText = (q: InterviewQuestion) => {
    const key = `q.${q.key}.help`;
    return t(key) !== key ? t(key) : q.helpText;
  };

  const getCategoryLabel = (cat: string) => {
    return t(`category.${cat}`);
  };

  // Check for saved state on mount
  useEffect(() => {
    if (!hasRestoredRef.current && hasSavedState()) {
      setShowRestoreDialog(true);
    }
  }, [hasSavedState]);

  // Auto-save after each change
  useEffect(() => {
    if (Object.keys(answers).length > 0 || transcript.length > 0) {
      saveState({
        currentCategory,
        currentQuestionIndex,
        answers,
        enrichedAnswers,
        transcript,
        pendingFollowUp,
      });
    }
  }, [answers, enrichedAnswers, transcript, currentCategory, currentQuestionIndex, pendingFollowUp, saveState]);

  const handleRestoreSession = () => {
    const saved = loadState();
    if (saved) {
      setCurrentCategory(saved.currentCategory);
      setCurrentQuestionIndex(saved.currentQuestionIndex);
      setAnswers(saved.answers);
      setEnrichedAnswers(saved.enrichedAnswers);
      setTranscript(saved.transcript);
      setPendingFollowUp(saved.pendingFollowUp);
      toast.success(language === 'de' ? 'Sitzung wiederhergestellt' : 'Session restored');
    }
    hasRestoredRef.current = true;
    setShowRestoreDialog(false);
  };

  const handleStartFresh = () => {
    clearState();
    hasRestoredRef.current = true;
    setShowRestoreDialog(false);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  useEffect(() => {
    // Add initial assistant message when category changes
    if (currentQuestion && !transcript.find(t => t.questionKey === currentQuestion.key)) {
      const categoryLabel = getCategoryLabel(currentCategory);
      const categoryIntro = currentQuestionIndex === 0 
        ? t('wizard.categoryIntro').replace('{category}', categoryLabel.toLowerCase()) + ' '
        : '';
      
      const questionText = getQuestionText(currentQuestion);
      const helpText = getHelpText(currentQuestion);
      
      const message = `${categoryIntro}${questionText}${helpText ? `\n\n💡 ${helpText}` : ''}`;
      
      setTranscript(prev => [...prev, {
        id: `msg-${Date.now()}`,
        intakeId: 'new',
        speaker: 'assistant',
        message,
        timestamp: new Date().toISOString(),
        questionKey: currentQuestion.key,
      }]);

      // Speak the question if voice is enabled
      if (voiceEnabled && !isSpeaking) {
        // Clean message for speech (remove emoji)
        const speechText = message.replace(/💡/g, '').replace(/\n\n/g, '. ');
        speak(speechText);
      }
    }
  }, [currentCategory, currentQuestionIndex, currentQuestion, language, voiceEnabled]);

  const validateWithAI = async (questionKey: string, questionText: string, answer: string) => {
    setIsValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-intake', {
        body: {
          questionKey,
          questionText,
          userAnswer: answer,
          category: currentCategory,
          previousAnswers: answers,
          language
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

    // Stop listening while processing
    if (isListening) {
      stopListening();
    }

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
    const additionLabel = t('wizard.addition');
    const combinedAnswer = pendingFollowUp 
      ? `${answers[currentQuestion.key] || ''}\n\n${additionLabel}: ${userMessage}`
      : userMessage;

    // Validate with AI
    const validation = await validateWithAI(
      currentQuestion.key, 
      pendingFollowUp || getQuestionText(currentQuestion),
      combinedAnswer
    );

    setCurrentValidation(validation);

    if (validation?.followUpQuestion && !pendingFollowUp) {
      // AI wants to ask a follow-up question
      setPendingFollowUp(validation.followUpQuestion);
      setIsProcessing(false);
      
      // Show AI follow-up question
      const tipLabel = language === 'de' ? 'Tipp' : 'Tip';
      const followUpMessage = `🤔 ${validation.followUpQuestion}${validation.suggestions?.length > 0 ? `\n\n💡 ${tipLabel}: ${validation.suggestions[0]}` : ''}`;
      
      setTranscript(prev => [...prev, {
        id: `msg-${Date.now()}`,
        intakeId: 'new',
        speaker: 'assistant',
        message: followUpMessage,
        timestamp: new Date().toISOString(),
      }]);

      // Speak follow-up if voice enabled
      if (voiceEnabled) {
        const speechText = followUpMessage.replace(/🤔|💡/g, '').replace(/\n\n/g, '. ');
        speak(speechText);
      }
      
      // Save partial answer
      setAnswers(prev => ({ ...prev, [currentQuestion.key]: combinedAnswer }));
      return;
    }

    // Clear follow-up state
    setPendingFollowUp(null);

    // Save answer (enriched if available)
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
      
      const qualityMessage = t(`quality.${validation.quality}`);
      const feedbackMessage = `${qualityEmoji} ${qualityMessage}`;

      // Add quality feedback
      setTranscript(prev => [...prev, {
        id: `msg-${Date.now()}-feedback`,
        intakeId: 'new',
        speaker: 'assistant',
        message: feedbackMessage,
        timestamp: new Date().toISOString(),
      }]);

      // Speak feedback if voice enabled
      if (voiceEnabled) {
        speak(qualityMessage);
      }
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
          const doneMessage = `✅ ${t('wizard.allDone')}`;
          setTranscript(prev => [...prev, {
            id: `msg-${Date.now()}`,
            intakeId: 'new',
            speaker: 'assistant',
            message: doneMessage,
            timestamp: new Date().toISOString(),
          }]);

          if (voiceEnabled) {
            speak(t('wizard.allDone'));
          }
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
      message: t('wizard.skipped'),
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

  const toggleVoice = () => {
    if (voiceEnabled) {
      stopListening();
      stopSpeaking();
      setVoiceEnabled(false);
      toast.info(language === 'de' ? 'Sprachmodus deaktiviert' : 'Voice mode disabled');
    } else {
      setVoiceEnabled(true);
      toast.success(language === 'de' ? 'Sprachmodus aktiviert - Sprechen Sie!' : 'Voice mode enabled - Start speaking!');
      startListening();
    }
  };

  const isComplete = answeredQuestions >= totalQuestions;

  const handleGenerateSpec = async () => {
    toast.loading(t('wizard.generatingSpec'), { id: 'gen-spec' });
    
    try {
      // Clear auto-save on success
      clearState();
      toast.success(t('wizard.specGenerated'), { id: 'gen-spec' });
      navigate('/intake/intake-1');
    } catch (error) {
      toast.error(t('wizard.specError'), { id: 'gen-spec' });
    }
  };

  return (
    <>
      {/* Restore Dialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'de' ? 'Vorherige Sitzung gefunden' : 'Previous session found'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'de' 
                ? 'Es wurde eine gespeicherte Interview-Sitzung gefunden. Möchten Sie diese wiederherstellen oder neu beginnen?'
                : 'A saved interview session was found. Would you like to restore it or start fresh?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleStartFresh}>
              {language === 'de' ? 'Neu beginnen' : 'Start Fresh'}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreSession}>
              <RotateCcw className="mr-2 h-4 w-4" />
              {language === 'de' ? 'Wiederherstellen' : 'Restore'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Progress Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t('wizard.progress')}</CardTitle>
                <LanguageSelector />
              </div>
              <CardDescription>{answeredQuestions} {t('wizard.questionsOf')} {totalQuestions} {t('wizard.questions')}</CardDescription>
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
                        <span className="text-sm font-medium">{getCategoryLabel(cat)}</span>
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

          {/* Voice Mode Toggle */}
          {voiceSupported && (
            <Card className={cn(
              "border-2 transition-colors",
              voiceEnabled ? "border-primary bg-primary/5" : "border-border"
            )}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {voiceEnabled ? (
                      <Mic className="h-5 w-5 text-primary animate-pulse" />
                    ) : (
                      <MicOff className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">
                        {language === 'de' ? 'Sprachmodus' : 'Voice Mode'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {voiceEnabled 
                          ? (isListening 
                              ? (language === 'de' ? 'Ich höre zu...' : 'Listening...') 
                              : (isSpeaking 
                                  ? (language === 'de' ? 'Ich spreche...' : 'Speaking...') 
                                  : (language === 'de' ? 'Aktiv' : 'Active')))
                          : (language === 'de' ? 'Tippen Sie oder sprechen Sie' : 'Type or speak')}
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant={voiceEnabled ? "default" : "outline"} 
                    size="sm"
                    onClick={toggleVoice}
                  >
                    {voiceEnabled ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Assistant Info */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">{t('wizard.aiActive')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('wizard.aiDescription')}
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
                  <span className="font-medium">{t('wizard.complete')}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('wizard.completeDesc')}
                </p>
                <Button onClick={handleGenerateSpec} className="w-full">
                  <FileText className="mr-2 h-4 w-4" />
                  {t('wizard.generateSpec')}
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
                  <CardTitle className="text-base">{t('wizard.title')}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {isValidating && (
                    <Badge variant="outline" className="gap-1">
                      <Sparkles className="h-3 w-3 animate-pulse" />
                      {t('wizard.aiChecking')}
                    </Badge>
                  )}
                  {isListening && (
                    <Badge variant="default" className="gap-1 bg-primary">
                      <Mic className="h-3 w-3 animate-pulse" />
                      {language === 'de' ? 'Höre...' : 'Listening...'}
                    </Badge>
                  )}
                  <Badge variant="outline">{getCategoryLabel(currentCategory)}</Badge>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {transcript.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t('wizard.startMessage')}</p>
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
                      {isValidating ? t('wizard.aiAnalyzing') : t('wizard.processing')}
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
                    <span>{t('wizard.followUp')}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleSkipFollowUp}>
                    {t('common.skip')}
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
                    placeholder={pendingFollowUp ? t('wizard.yourAddition') : t('wizard.yourAnswer')}
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
                    placeholder={t('wizard.yourAnswer')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSubmitAnswer();
                      }
                    }}
                  />
                )}
                
                {/* Voice toggle button in input area */}
                {voiceSupported && (
                  <Button
                    variant={isListening ? "default" : "outline"}
                    size="icon"
                    className="flex-shrink-0"
                    onClick={() => isListening ? stopListening() : startListening()}
                  >
                    {isListening ? <Mic className="h-4 w-4 animate-pulse" /> : <MicOff className="h-4 w-4" />}
                  </Button>
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
    </>
  );
}
