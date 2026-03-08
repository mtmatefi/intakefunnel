import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  RotateCcw,
  Check,
  Plus,
  X,
  Target,
  Link2,
  TrendingUp,
  Layers,
  Zap,
  GitBranch,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useVoiceAssistant, type VoiceAssistantState } from '@/hooks/useVoiceAssistant';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateIntake, useSaveTranscript, useGenerateSpec } from '@/hooks/useIntakes';
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

const categories = ['problem', 'users', 'data', 'integrations', 'ux', 'nfr', 'compliance'] as const;

interface MatchedInitiative {
  initiative_id: string;
  initiative_title: string;
  match_score: 'high' | 'medium' | 'low';
  match_reason: string;
}

interface AdaptiveQuestion {
  question: string;
  reason: string;
}

interface AIValidation {
  isComplete: boolean;
  quality: 'excellent' | 'good' | 'needs_improvement' | 'insufficient';
  followUpQuestion: string | null;
  suggestions: string[];
  enrichedAnswer: string | null;
  missingAspects: string[];
  complianceFlags?: string[];
  classifiedType: 'initiative' | 'value_stream_epic' | 'epic' | 'feature' | null;
  classificationConfidence: 'high' | 'medium' | 'low' | null;
  classificationReason: string | null;
  matchedInitiatives: MatchedInitiative[];
  adaptiveQuestions: AdaptiveQuestion[];
}

type IntakeClassification = 'initiative' | 'value_stream_epic' | 'epic' | 'feature' | null;

interface InnovationContext {
  id: string;
  externalId: string;
  title: string;
  description?: string;
  hypothesis?: string;
  valueProposition?: string;
  expectedOutcome?: string;
  effortEstimate?: string;
  responsible?: string;
  learnings?: string;
  targetDate?: string;
  impactData?: any[];
  riskData?: any[];
  trendData?: any[];
}

function buildPrefilledAnswers(ctx: InnovationContext): Record<string, string> {
  const prefilled: Record<string, string> = {};
  
  // problem_statement: combine description + hypothesis
  const problemParts: string[] = [];
  if (ctx.description) problemParts.push(ctx.description);
  if (ctx.hypothesis) problemParts.push(`Hypothese: ${ctx.hypothesis}`);
  if (problemParts.length > 0) prefilled['problem_statement'] = problemParts.join('\n\n');
  
  // goals: expected outcome + value proposition
  const goalParts: string[] = [];
  if (ctx.expectedOutcome) goalParts.push(ctx.expectedOutcome);
  if (ctx.valueProposition) goalParts.push(`Value Proposition: ${ctx.valueProposition}`);
  if (goalParts.length > 0) prefilled['goals'] = goalParts.join('\n\n');
  
  // pain_points from learnings
  if (ctx.learnings) prefilled['pain_points'] = ctx.learnings;
  
  // timeline from target date + effort
  const timeParts: string[] = [];
  if (ctx.targetDate) timeParts.push(`Zieldatum: ${new Date(ctx.targetDate).toLocaleDateString('de-DE')}`);
  if (ctx.effortEstimate) timeParts.push(`Geschätzter Aufwand: ${ctx.effortEstimate}`);
  if (timeParts.length > 0) prefilled['timeline'] = timeParts.join('\n');
  
  // risks → regulatory_requirements
  if (ctx.riskData && ctx.riskData.length > 0) {
    prefilled['regulatory_requirements'] = 'Identifizierte Risiken aus Innovation:\n' + 
      ctx.riskData.map((r: any) => `- ${r.title || r.name}: ${r.description || ''}`).join('\n');
  }

  // impact_data → can inform current_process context
  if (ctx.impactData && ctx.impactData.length > 0) {
    prefilled['current_process'] = 'Bekannte Impact-Daten aus der Innovation:\n' +
      ctx.impactData.map((d: any) => `- ${d.label || d.title || ''}: ${d.value || d.description || ''}`).join('\n');
  }
  
  return prefilled;
}

function buildInnovationSummary(ctx: InnovationContext, prefilledKeys: string[], remainingCount: number): string {
  let msg = `Hallo! 👋 Ich habe die Daten aus der Innovation **"${ctx.title}"** übernommen.\n\n`;
  msg += `Hier eine kurze Zusammenfassung, was wir bereits wissen:\n\n`;
  
  if (ctx.description) msg += `**Beschreibung:** ${ctx.description}\n\n`;
  if (ctx.hypothesis) msg += `**Hypothese:** ${ctx.hypothesis}\n\n`;
  if (ctx.expectedOutcome) msg += `**Erwartetes Ergebnis:** ${ctx.expectedOutcome}\n\n`;
  if (ctx.valueProposition) msg += `**Wertversprechen:** ${ctx.valueProposition}\n\n`;
  if (ctx.learnings) msg += `**Bisherige Erkenntnisse:** ${ctx.learnings}\n\n`;
  if (ctx.responsible) msg += `**Verantwortlich:** ${ctx.responsible}\n\n`;
  if (ctx.targetDate) msg += `**Zieldatum:** ${new Date(ctx.targetDate).toLocaleDateString('de-DE')}\n\n`;
  if (ctx.effortEstimate) msg += `**Aufwandsschätzung:** ${ctx.effortEstimate}\n\n`;
  
  if (ctx.riskData && ctx.riskData.length > 0) {
    msg += `**Bekannte Risiken:**\n`;
    ctx.riskData.forEach((r: any) => { msg += `- ${r.title || r.name}: ${r.description || ''}\n`; });
    msg += '\n';
  }

  msg += `---\n\n`;
  msg += `Damit sind **${prefilledKeys.length} von ${prefilledKeys.length + remainingCount} Bereichen** bereits abgedeckt. `;
  msg += `Ich stelle dir jetzt nur noch die **${remainingCount} offenen Fragen**, um den Intake zu vervollständigen.\n\n`;
  msg += `Lass uns loslegen! 🚀`;
  
  return msg;
}

export function IntakeWizard({ innovationContext }: { innovationContext?: InnovationContext | null }) {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const { saveState, loadState, clearState, hasSavedState } = useAutoSave();
  
  // Database mutations
  const createIntake = useCreateIntake();
  const saveTranscript = useSaveTranscript();
  const generateSpec = useGenerateSpec();
  const [isSaving, setIsSaving] = useState(false);
  
  // Pre-fill from innovation context
  const prefilledAnswers = innovationContext ? buildPrefilledAnswers(innovationContext) : {};
  
  const [currentCategory, setCurrentCategory] = useState<string>('problem');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(prefilledAnswers);
  const [enrichedAnswers, setEnrichedAnswers] = useState<Record<string, string>>({});
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [pendingFollowUp, setPendingFollowUp] = useState<string | null>(null);
  const [currentValidation, setCurrentValidation] = useState<AIValidation | null>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [classification, setClassification] = useState<IntakeClassification>(null);
  const [classificationConfidence, setClassificationConfidence] = useState<string | null>(null);
  const [classificationReason, setClassificationReason] = useState<string | null>(null);
  const [matchedInitiatives, setMatchedInitiatives] = useState<MatchedInitiative[]>([]);
  const [confirmedInitiatives, setConfirmedInitiatives] = useState<MatchedInitiative[]>([]);
  const [pendingAdaptiveQuestions, setPendingAdaptiveQuestions] = useState<AdaptiveQuestion[]>([]);
  const [userClassificationOverride, setUserClassificationOverride] = useState<IntakeClassification>(null);
  const [innovationPrefillShown, setInnovationPrefillShown] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const hasRestoredRef = useRef(false);

  // Voice assistant integration
  const handleVoiceAnswer = useCallback((answer: string) => {
    setInputValue(answer);
  }, []);

  const voiceAssistant = useVoiceAssistant({
    language,
    onAnswerComplete: handleVoiceAnswer,
    silenceTimeout: 3000,
  });

  // Listen for voice submit events
  useEffect(() => {
    const handleVoiceSubmit = () => {
      if (inputValue.trim()) {
        handleSubmitAnswer();
      }
    };
    window.addEventListener('voice-submit', handleVoiceSubmit);
    return () => window.removeEventListener('voice-submit', handleVoiceSubmit);
  }, [inputValue]);

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

  // Skip to the first unanswered question
  const skipToFirstUnanswered = () => {
    for (const cat of categories) {
      const catQs = interviewQuestions.filter(q => q.category === cat);
      const firstUnansweredIdx = catQs.findIndex(q => !answers[q.key]);
      if (firstUnansweredIdx >= 0) {
        setCurrentCategory(cat);
        setCurrentQuestionIndex(firstUnansweredIdx);
        return;
      }
    }
  };


  useEffect(() => {
    if (!hasRestoredRef.current && hasSavedState()) {
      setShowRestoreDialog(true);
    }
  }, [hasSavedState]);

  // Show innovation prefill summary on mount
  useEffect(() => {
    if (innovationContext && !innovationPrefillShown) {
      setInnovationPrefillShown(true);
      const prefilledKeys = Object.keys(prefilledAnswers);
      const allKeys = interviewQuestions.map(q => q.key);
      const remainingKeys = allKeys.filter(k => !prefilledKeys.includes(k));
      
      const summaryMsg = buildInnovationSummary(innovationContext, prefilledKeys, remainingKeys.length);

      setTranscript([{
        id: `msg-innovation-prefill`,
        intakeId: 'new',
        speaker: 'assistant',
        message: summaryMsg,
        timestamp: new Date().toISOString(),
      }]);

      // Skip to first unanswered question
      skipToFirstUnanswered();
    }
  }, [innovationContext, innovationPrefillShown]);

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
    // Skip if question is already pre-filled from innovation context
    if (currentQuestion && !transcript.find(t => t.questionKey === currentQuestion.key)) {
      // Don't show the standard question prompt if it's already answered via prefill
      if (answers[currentQuestion.key] && prefilledAnswers[currentQuestion.key]) return;
      
      const categoryLabel = getCategoryLabel(currentCategory);
      
      // When coming from innovation context, use a softer transition instead of the generic category intro
      let categoryIntro = '';
      if (currentQuestionIndex === 0) {
        if (innovationContext) {
          categoryIntro = `Gut, zum Thema **${categoryLabel}** hätte ich noch eine Frage: `;
        } else {
          categoryIntro = t('wizard.categoryIntro').replace('{category}', categoryLabel.toLowerCase()) + ' ';
        }
      }
      
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
    }
  }, [currentCategory, currentQuestionIndex, currentQuestion, language]);

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

      // If voice mode is active, speak the follow-up
      if (voiceAssistant.state !== 'idle') {
        const speechText = followUpMessage.replace(/🤔|💡/g, '').replace(/\n\n/g, '. ');
        voiceAssistant.startWithQuestion(speechText);
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

    // Update classification from AI
    if (validation) {
      if (validation.classifiedType && !userClassificationOverride) {
        setClassification(validation.classifiedType);
        setClassificationConfidence(validation.classificationConfidence);
        setClassificationReason(validation.classificationReason);
      }

      // Update matched initiatives
      if (validation.matchedInitiatives?.length > 0) {
        setMatchedInitiatives(prev => {
          const existingIds = prev.map(m => m.initiative_id);
          const newMatches = validation.matchedInitiatives.filter(
            (m: MatchedInitiative) => !existingIds.includes(m.initiative_id)
          );
          return [...prev, ...newMatches];
        });
      }

      // Queue adaptive questions
      if (validation.adaptiveQuestions?.length > 0) {
        setPendingAdaptiveQuestions(prev => [...prev, ...validation.adaptiveQuestions]);
      }
    }

    // Show quality feedback + classification + matches
    if (validation) {
      const qualityEmoji = {
        excellent: '✨',
        good: '✓',
        needs_improvement: '📝',
        insufficient: '⚠️'
      }[validation.quality];
      
      const qualityMessage = t(`quality.${validation.quality}`);
      let feedbackMessage = `${qualityEmoji} ${qualityMessage}`;

      // Add classification info
      if (validation.classifiedType) {
        const typeLabels: Record<string, string> = {
          initiative: '🎯 Initiative',
          value_stream_epic: '📊 Value Stream Epic',
          epic: '📦 Epic',
          feature: '⚡ Feature',
        };
        const confLabel = validation.classificationConfidence === 'high' ? '✅' : validation.classificationConfidence === 'medium' ? '🔶' : '🔸';
        feedbackMessage += `\n\n${language === 'de' ? 'Klassifizierung' : 'Classification'}: ${typeLabels[validation.classifiedType]} ${confLabel}`;
        if (validation.classificationReason) {
          feedbackMessage += `\n_${validation.classificationReason}_`;
        }
      }

      // Add initiative match info
      if (validation.matchedInitiatives?.length > 0) {
        feedbackMessage += `\n\n🔗 ${language === 'de' ? 'Mögliche Verknüpfung gefunden' : 'Possible link found'}:`;
        for (const match of validation.matchedInitiatives) {
          const scoreEmoji = match.match_score === 'high' ? '🟢' : match.match_score === 'medium' ? '🟡' : '🟠';
          feedbackMessage += `\n${scoreEmoji} **${match.initiative_title}** – ${match.match_reason}`;
        }
      }

      setTranscript(prev => [...prev, {
        id: `msg-${Date.now()}-feedback`,
        intakeId: 'new',
        speaker: 'assistant',
        message: feedbackMessage,
        timestamp: new Date().toISOString(),
      }]);
    }

    // Check if there are adaptive questions to inject before moving on
    if (pendingAdaptiveQuestions.length > 0) {
      const adaptiveQ = pendingAdaptiveQuestions[0];
      setPendingAdaptiveQuestions(prev => prev.slice(1));
      setPendingFollowUp(adaptiveQ.question);
      setIsProcessing(false);

      const adaptiveMsg = `🔍 ${adaptiveQ.question}\n\n_${language === 'de' ? 'Hintergrund' : 'Context'}: ${adaptiveQ.reason}_`;
      setTranscript(prev => [...prev, {
        id: `msg-${Date.now()}-adaptive`,
        intakeId: 'new',
        speaker: 'assistant',
        message: adaptiveMsg,
        timestamp: new Date().toISOString(),
      }]);

      setAnswers(prev => ({ ...prev, [currentQuestion.key]: combinedAnswer }));
      return;
    }

    setIsProcessing(false);

    // Move to next unanswered question after a short delay
    setTimeout(() => {
      // Find next unanswered question (skips pre-filled)
      const findNextUnanswered = (): { cat: string; idx: number } | null => {
        // First check remaining questions in current category
        for (let i = currentQuestionIndex + 1; i < categoryQuestions.length; i++) {
          if (!answers[categoryQuestions[i].key] || categoryQuestions[i].key === currentQuestion?.key) {
            if (!prefilledAnswers[categoryQuestions[i].key]) return { cat: currentCategory, idx: i };
          }
        }
        // Then check subsequent categories
        const catIdx = categories.indexOf(currentCategory as typeof categories[number]);
        for (let c = catIdx + 1; c < categories.length; c++) {
          const catQs = interviewQuestions.filter(q => q.category === categories[c]);
          for (let i = 0; i < catQs.length; i++) {
            if (!answers[catQs[i].key] && !prefilledAnswers[catQs[i].key]) return { cat: categories[c], idx: i };
          }
        }
        return null;
      };

      const next = findNextUnanswered();
      if (next) {
        setCurrentCategory(next.cat);
        setCurrentQuestionIndex(next.idx);
        if (voiceAssistant.state !== 'idle') {
          const nextCatQs = interviewQuestions.filter(q => q.category === next.cat);
          const nextQ = nextCatQs[next.idx];
          if (nextQ) {
            setTimeout(() => voiceAssistant.startWithQuestion(getQuestionText(nextQ)), 500);
          }
        }
      } else {
        // All done
        const doneMessage = `✅ ${t('wizard.allDone')}`;
        setTranscript(prev => [...prev, {
          id: `msg-${Date.now()}`,
          intakeId: 'new',
          speaker: 'assistant',
          message: doneMessage,
          timestamp: new Date().toISOString(),
        }]);
        if (voiceAssistant.state !== 'idle') {
          voiceAssistant.stopAssistant();
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

  // Toggle voice assistant
  const toggleVoiceAssistant = () => {
    if (voiceAssistant.state !== 'idle') {
      voiceAssistant.stopAssistant();
      toast.info(language === 'de' ? 'Sprachassistent beendet' : 'Voice assistant stopped');
    } else if (currentQuestion) {
      const questionText = getQuestionText(currentQuestion);
      voiceAssistant.startWithQuestion(questionText);
      toast.success(
        language === 'de' 
          ? 'Sprachassistent gestartet - Lehnen Sie sich zurück!' 
          : 'Voice assistant started - Sit back and relax!'
      );
    }
  };

  const isComplete = answeredQuestions >= totalQuestions;

  const handleGenerateSpec = async () => {
    if (!user) {
      toast.error(language === 'de' ? 'Bitte zuerst anmelden' : 'Please login first');
      navigate('/login');
      return;
    }

    setIsSaving(true);
    
    try {
      // Step 1: Create intake record
      toast.loading(language === 'de' ? 'Speichere Interview...' : 'Saving interview...', { id: 'gen-spec' });
      
      // Generate title from innovation or first answer
      const title = innovationContext?.title ||
                    answers['problem_statement']?.substring(0, 100) || 
                    answers['current_process']?.substring(0, 100) ||
                    `Intake ${new Date().toLocaleDateString()}`;
      
      // Use classification as category if available
      const classificationLabel = classification ? {
        initiative: 'Initiative',
        value_stream_epic: 'Value Stream Epic',
        epic: 'Epic',
        feature: 'Feature',
      }[classification] : undefined;

      const intake = await createIntake.mutateAsync({
        title,
        valueStream: answers['value_stream'] || undefined,
        category: classificationLabel || answers['category'] || undefined,
      });

      console.log('Created intake:', intake.id);

      // Step 2: Save transcript
      toast.loading(language === 'de' ? 'Speichere Gespräch...' : 'Saving conversation...', { id: 'gen-spec' });
      
      const transcriptMessages = transcript.map(msg => ({
        speaker: msg.speaker,
        message: msg.message,
        questionKey: msg.questionKey || undefined,
        timestamp: msg.timestamp,
      }));

      await saveTranscript.mutateAsync({
        intakeId: intake.id,
        messages: transcriptMessages,
      });

      console.log('Saved transcript:', transcriptMessages.length, 'messages');

      // Step 2.5: Link confirmed initiatives
      if (confirmedInitiatives.length > 0) {
        toast.loading(language === 'de' ? 'Verknüpfe Initiativen...' : 'Linking initiatives...', { id: 'gen-spec' });
        for (const initiative of confirmedInitiatives) {
          await supabase
            .from('initiative_intake_links')
            .update({ intake_id: intake.id, sync_status: 'linked' })
            .eq('initiative_id', initiative.initiative_id);
        }
        console.log('Linked', confirmedInitiatives.length, 'initiatives');
      }
      toast.loading(language === 'de' ? 'Generiere Spezifikation mit KI...' : 'Generating specification with AI...', { id: 'gen-spec' });
      
      await generateSpec.mutateAsync(intake.id);

      console.log('Generated spec for intake:', intake.id);

      // Clear auto-save on success
      clearState();
      
      toast.success(
        language === 'de' ? 'Spezifikation erstellt!' : 'Specification generated!', 
        { 
          id: 'gen-spec',
          description: language === 'de' 
            ? 'KI hat das Interview analysiert und eine strukturierte Spezifikation erstellt'
            : 'AI has analyzed the interview and created a structured specification',
        }
      );

      // Navigate to the detail page
      navigate(`/intake/${intake.id}`);
      
    } catch (error) {
      console.error('Error in handleGenerateSpec:', error);
      toast.error(
        language === 'de' ? 'Fehler beim Speichern' : 'Error saving', 
        { 
          id: 'gen-spec',
          description: error instanceof Error ? error.message : 'Unknown error',
        }
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Get voice state indicator
  const getVoiceStateInfo = (): { icon: React.ReactNode; text: string; color: string } => {
    switch (voiceAssistant.state) {
      case 'speaking':
        return { 
          icon: <Mic className="h-4 w-4" />, 
          text: language === 'de' ? 'Ich spreche...' : 'Speaking...', 
          color: 'bg-primary text-primary-foreground' 
        };
      case 'listening':
        return { 
          icon: <Mic className="h-4 w-4 animate-pulse" />, 
          text: language === 'de' ? 'Ich höre zu...' : 'Listening...', 
          color: 'bg-destructive text-destructive-foreground' 
        };
      case 'confirming':
        return { 
          icon: <HelpCircle className="h-4 w-4" />, 
          text: language === 'de' ? 'Noch etwas?' : 'Anything else?', 
          color: 'bg-warning text-warning-foreground' 
        };
      case 'processing':
        return { 
          icon: <Loader2 className="h-4 w-4 animate-spin" />, 
          text: language === 'de' ? 'Verarbeite...' : 'Processing...', 
          color: 'bg-muted text-muted-foreground' 
        };
      default:
        return { 
          icon: <MicOff className="h-4 w-4" />, 
          text: '', 
          color: '' 
        };
    }
  };

  const voiceStateInfo = getVoiceStateInfo();

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
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

          {/* AI Classification Card */}
          {classification && (
            <Card className="border-primary/30">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{language === 'de' ? 'KI-Klassifizierung' : 'AI Classification'}</span>
                  </div>
                  <Badge variant={classificationConfidence === 'high' ? 'default' : 'secondary'} className="text-xs">
                    {classificationConfidence === 'high' ? '✅' : classificationConfidence === 'medium' ? '🔶' : '🔸'} {classificationConfidence}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  {(['initiative', 'value_stream_epic', 'epic', 'feature'] as const).map(type => {
                    const labels: Record<string, { icon: React.ReactNode; label: string }> = {
                      initiative: { icon: <TrendingUp className="h-3 w-3" />, label: 'Initiative' },
                      value_stream_epic: { icon: <Layers className="h-3 w-3" />, label: 'Value Stream Epic' },
                      epic: { icon: <GitBranch className="h-3 w-3" />, label: 'Epic' },
                      feature: { icon: <Zap className="h-3 w-3" />, label: 'Feature' },
                    };
                    const isSelected = (userClassificationOverride || classification) === type;
                    return (
                      <button
                        key={type}
                        onClick={() => {
                          setUserClassificationOverride(type);
                          setClassification(type);
                          toast.info(language === 'de' 
                            ? `Typ auf "${labels[type].label}" geändert` 
                            : `Type changed to "${labels[type].label}"`);
                        }}
                        className={cn(
                          'w-full flex items-center gap-2 p-2 rounded-md text-sm transition-colors',
                          isSelected ? 'bg-primary/15 text-primary font-medium border border-primary/30' : 'hover:bg-muted/50 text-muted-foreground'
                        )}
                      >
                        {labels[type].icon}
                        {labels[type].label}
                        {isSelected && <CheckCircle className="h-3 w-3 ml-auto" />}
                      </button>
                    );
                  })}
                </div>

                {classificationReason && (
                  <p className="text-xs text-muted-foreground italic">{classificationReason}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Matched Initiatives */}
          {matchedInitiatives.length > 0 && (
            <Card className="border-warning/30">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-warning" />
                  <span className="text-sm font-medium">{language === 'de' ? 'Initiativen-Matches' : 'Initiative Matches'}</span>
                </div>
                
                <div className="space-y-2">
                  {matchedInitiatives.map(match => {
                    const isConfirmed = confirmedInitiatives.some(c => c.initiative_id === match.initiative_id);
                    const scoreColor = match.match_score === 'high' ? 'text-success' : match.match_score === 'medium' ? 'text-warning' : 'text-muted-foreground';
                    return (
                      <div key={match.initiative_id} className={cn(
                        'p-2 rounded-md border text-sm space-y-1',
                        isConfirmed ? 'border-success/40 bg-success/5' : 'border-border'
                      )}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className={cn('font-medium text-xs truncate', scoreColor)}>
                              {match.match_score === 'high' ? '🟢' : match.match_score === 'medium' ? '🟡' : '🟠'} {match.initiative_title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">{match.match_reason}</p>
                          </div>
                          {!isConfirmed ? (
                            <Button size="sm" variant="outline" className="shrink-0 text-xs h-7" onClick={() => {
                              setConfirmedInitiatives(prev => [...prev, match]);
                              toast.success(language === 'de' 
                                ? `"${match.initiative_title}" verknüpft` 
                                : `"${match.initiative_title}" linked`);
                            }}>
                              <Link2 className="h-3 w-3 mr-1" />
                              {language === 'de' ? 'Verknüpfen' : 'Link'}
                            </Button>
                          ) : (
                            <Badge variant="outline" className="text-success border-success/40 text-xs shrink-0">
                              <CheckCircle className="h-3 w-3 mr-1" /> {language === 'de' ? 'Verknüpft' : 'Linked'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
                <Button 
                  onClick={handleGenerateSpec} 
                  className="w-full"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="mr-2 h-4 w-4" />
                  )}
                  {isSaving 
                    ? (language === 'de' ? 'Speichere...' : 'Saving...') 
                    : t('wizard.generateSpec')}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Chat Interface */}
        <div className="lg:col-span-2">
          <Card className="h-[450px] sm:h-[600px] flex flex-col">
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
                  {voiceAssistant.state !== 'idle' && (
                    <Badge className={cn("gap-1", voiceStateInfo.color)}>
                      {voiceStateInfo.icon}
                      {voiceStateInfo.text}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="gap-1 tabular-nums">
                    {totalQuestions - answeredQuestions > 0 
                      ? `${language === 'de' ? 'Noch' : ''} ~${totalQuestions - answeredQuestions} ${language === 'de' ? 'Fragen offen' : 'left'}`
                      : (language === 'de' ? '✅ Fertig' : '✅ Done')
                    }
                  </Badge>
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
                      'max-w-[80%] p-3 text-sm rounded-lg prose prose-sm dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-headings:my-1 max-w-none',
                      msg.speaker === 'user'
                        ? 'bg-primary text-primary-foreground prose-p:text-primary-foreground prose-strong:text-primary-foreground prose-em:text-primary-foreground'
                        : 'bg-muted text-foreground'
                    )}
                  >
                    <ReactMarkdown>{msg.message}</ReactMarkdown>
                  </div>
                </div>
              ))}

              {/* Live transcript while listening */}
              {voiceAssistant.state === 'listening' && (voiceAssistant.currentTranscript || voiceAssistant.interimText) && (
                <div className="flex justify-end">
                  <div className="max-w-[80%] p-3 text-sm rounded-lg bg-primary/20 text-foreground border-2 border-dashed border-primary">
                    <p className="text-xs text-muted-foreground mb-1">
                      {language === 'de' ? '📝 Live-Mitschrift:' : '📝 Live transcript:'}
                    </p>
                    {voiceAssistant.currentTranscript}
                    {voiceAssistant.interimText && (
                      <span className="opacity-60"> {voiceAssistant.interimText}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Confirmation UI */}
              {voiceAssistant.state === 'confirming' && (
                <div className="flex justify-start">
                  <div className="bg-muted p-3 rounded-lg space-y-3">
                    <p className="text-sm">
                      {language === 'de' 
                        ? 'Ist das vollständig, oder möchten Sie noch etwas hinzufügen?' 
                        : 'Is that complete, or would you like to add something?'}
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => voiceAssistant.confirmAnswer()}
                        className="gap-1"
                      >
                        <Check className="h-3 w-3" />
                        {language === 'de' ? 'Fertig' : 'Done'}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => voiceAssistant.continueListening()}
                        className="gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        {language === 'de' ? 'Mehr hinzufügen' : 'Add more'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
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
                
                {/* Voice Assistant Button */}
                {voiceAssistant.isSupported && (
                  <Button
                    variant={voiceAssistant.state !== 'idle' ? "destructive" : "outline"}
                    size="icon"
                    className="flex-shrink-0"
                    onClick={toggleVoiceAssistant}
                    title={language === 'de' ? 'Sprachassistent' : 'Voice Assistant'}
                  >
                    {voiceAssistant.state !== 'idle' ? (
                      <X className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
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
