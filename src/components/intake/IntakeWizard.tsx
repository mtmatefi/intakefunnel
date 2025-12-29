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
import { interviewQuestions } from '@/data/demo';
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
} from 'lucide-react';
import { toast } from 'sonner';

const categories = ['problem', 'users', 'data', 'integrations', 'ux', 'nfr'] as const;
const categoryLabels: Record<string, string> = {
  problem: 'Problem & Goals',
  users: 'Users & Usage',
  data: 'Data & Security',
  integrations: 'Integrations',
  ux: 'User Experience',
  nfr: 'Requirements',
};

export function IntakeWizard() {
  const navigate = useNavigate();
  const [currentCategory, setCurrentCategory] = useState<string>('problem');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
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
        `Great, let's talk about ${categoryLabels[currentCategory].toLowerCase()}. ` : '';
      
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

  const handleSubmitAnswer = () => {
    if (!inputValue.trim() || !currentQuestion) return;

    // Add user message to transcript
    setTranscript(prev => [...prev, {
      id: `msg-${Date.now()}`,
      intakeId: 'new',
      speaker: 'user',
      message: inputValue,
      timestamp: new Date().toISOString(),
    }]);

    // Save answer
    setAnswers(prev => ({ ...prev, [currentQuestion.key]: inputValue }));
    setInputValue('');
    setIsProcessing(true);

    // Simulate processing
    setTimeout(() => {
      setIsProcessing(false);
      
      // Move to next question
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
            message: '✅ Excellent! I have all the information I need. I\'ll now generate a structured specification and routing recommendation for your review.',
            timestamp: new Date().toISOString(),
          }]);
        }
      }
    }, 500);
  };

  const handleSelectAnswer = (value: string) => {
    setInputValue(value);
  };

  const isComplete = answeredQuestions >= totalQuestions;

  const handleGenerateSpec = () => {
    toast.success('Generating specification...');
    // In production, this would call the AI to generate the spec
    navigate('/intake/intake-1'); // Navigate to demo intake for now
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Progress Sidebar */}
      <div className="lg:col-span-1 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Interview Progress</CardTitle>
            <CardDescription>{answeredQuestions} of {totalQuestions} questions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progress} className="h-2" />
            
            <div className="space-y-2">
              {categories.map((cat, index) => {
                const catQuestions = interviewQuestions.filter(q => q.category === cat);
                const catAnswered = catQuestions.filter(q => answers[q.key]).length;
                const isActive = currentCategory === cat;
                const isComplete = catAnswered === catQuestions.length;
                
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setCurrentCategory(cat);
                      setCurrentQuestionIndex(0);
                    }}
                    className={cn(
                      'w-full flex items-center justify-between p-2 text-left transition-colors',
                      isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50',
                      isComplete && 'text-success'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'w-6 h-6 flex items-center justify-center text-xs font-medium',
                        isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                        isComplete && 'bg-success text-success-foreground'
                      )}>
                        {isComplete ? <CheckCircle className="h-4 w-4" /> : index + 1}
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

        {isComplete && (
          <Card className="border-success">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 text-success">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Interview Complete</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Ready to generate your specification and routing recommendation.
              </p>
              <Button onClick={handleGenerateSpec} className="w-full">
                <FileText className="mr-2 h-4 w-4" />
                Generate Specification
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
              <Badge variant="outline">{categoryLabels[currentCategory]}</Badge>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {transcript.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Starting your intake interview...</p>
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
                    'max-w-[80%] p-3 text-sm whitespace-pre-wrap',
                    msg.speaker === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  )}
                >
                  {msg.message}
                </div>
              </div>
            ))}
            
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-muted p-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </CardContent>

          {/* Input Area */}
          <div className="p-4 border-t border-border space-y-3">
            {currentQuestion?.inputType === 'select' && currentQuestion.options && (
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
              {currentQuestion?.inputType === 'textarea' ? (
                <Textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type your response..."
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
                  placeholder="Type your response..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSubmitAnswer();
                    }
                  }}
                />
              )}
              <Button 
                onClick={handleSubmitAnswer} 
                disabled={!inputValue.trim() || isProcessing}
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
