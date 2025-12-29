import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  demoIntakes, 
  demoTranscript, 
  demoSpec, 
  demoRoutingScore,
  deliveryPathInfo 
} from '@/data/demo';
import { cn } from '@/lib/utils';
import { 
  ArrowLeft, 
  FileText, 
  MessageSquare, 
  Route, 
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Send,
  Edit,
  Clock,
  Users,
  Database,
  Plug,
  Smartphone,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

export default function IntakeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('spec');

  const intake = demoIntakes.find(i => i.id === id) || demoIntakes[0];
  const transcript = demoTranscript;
  const spec = demoSpec;
  const routing = demoRoutingScore;
  const pathInfo = deliveryPathInfo[routing.path];

  const handleExportToJira = () => {
    toast.success('Exporting to Jira...', {
      description: 'This will create JPD Idea, Epic, and Stories',
    });
  };

  const handleRequestApproval = () => {
    toast.success('Sent for approval', {
      description: 'An architect will review your intake',
    });
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-foreground">{intake.title}</h1>
                <Badge variant={intake.status === 'pending_approval' ? 'default' : 'secondary'}>
                  {intake.status.replace(/_/g, ' ')}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Requested by {intake.requesterName} • {intake.valueStream} • {intake.category}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            {intake.status === 'spec_generated' && (
              <Button onClick={handleRequestApproval}>
                <Send className="mr-2 h-4 w-4" />
                Request Approval
              </Button>
            )}
            {intake.status === 'approved' && (
              <Button onClick={handleExportToJira}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Export to Jira
              </Button>
            )}
          </div>
        </div>

        {/* Routing Summary Card */}
        <Card className="border-2" style={{ borderColor: `hsl(var(--${pathInfo.color}))` }}>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div 
                  className="w-12 h-12 flex items-center justify-center text-primary-foreground font-bold"
                  style={{ backgroundColor: `hsl(var(--${pathInfo.color}))` }}
                >
                  <Route className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Recommended Delivery Path</p>
                  <p className="text-xl font-bold">{pathInfo.label}</p>
                  <p className="text-sm text-muted-foreground">{pathInfo.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold">{routing.score}</p>
                  <p className="text-xs text-muted-foreground">Complexity Score</p>
                </div>
                <Button variant="outline" onClick={() => setActiveTab('routing')}>
                  View Analysis
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="spec" className="gap-2">
              <FileText className="h-4 w-4" />
              Specification
            </TabsTrigger>
            <TabsTrigger value="transcript" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Transcript
            </TabsTrigger>
            <TabsTrigger value="routing" className="gap-2">
              <Route className="h-4 w-4" />
              Routing
            </TabsTrigger>
          </TabsList>

          {/* Specification Tab */}
          <TabsContent value="spec" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Problem & Goals */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Problem Statement
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm">{spec.problemStatement}</p>
                  
                  <div>
                    <p className="text-sm font-medium mb-2">Current Process</p>
                    <p className="text-sm text-muted-foreground">{spec.currentProcess}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium mb-2">Pain Points</p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {spec.painPoints.map((pain, i) => (
                        <li key={i}>{pain}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium mb-2">Goals</p>
                    <ul className="space-y-1">
                      {spec.goals.map((goal, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                          {goal}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Users */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Users & Usage
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {spec.users.map((user, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-muted/50">
                        <span className="text-sm font-medium">{user.persona}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{user.count} users</Badge>
                          <Badge variant="secondary">{user.techLevel}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Frequency</p>
                      <p className="font-medium">{spec.frequency}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Volumes</p>
                      <p className="font-medium">{spec.volumes}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Data & Security */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Data & Security
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Classification</span>
                    <Badge variant={spec.dataClassification === 'restricted' ? 'destructive' : 'secondary'}>
                      {spec.dataClassification}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Retention</span>
                    <span className="text-sm font-medium">{spec.retentionPeriod}</span>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Data Types</p>
                    <div className="flex flex-wrap gap-1">
                      {spec.dataTypes.map((type, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{type}</Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Privacy Requirements</p>
                    <ul className="text-sm space-y-1">
                      {spec.privacyRequirements.map((req, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <Shield className="h-3 w-3 text-success" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Integrations */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Plug className="h-4 w-4" />
                    Integrations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {spec.integrations.map((int, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-muted/50">
                      <span className="text-sm font-medium">{int.system}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{int.type}</Badge>
                        <Badge 
                          variant={int.priority === 'must' ? 'default' : 'secondary'}
                        >
                          {int.priority}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* UX Needs */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    UX Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {spec.uxNeeds.map((ux, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-muted/50">
                      <div>
                        <span className="text-sm font-medium capitalize">{ux.type}</span>
                        <p className="text-xs text-muted-foreground">{ux.description}</p>
                      </div>
                      <Badge 
                        variant={ux.priority === 'must' ? 'default' : 'secondary'}
                      >
                        {ux.priority}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* NFRs */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Non-Functional Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Availability</p>
                      <p className="font-medium">{spec.nfrs.availability}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Response Time</p>
                      <p className="font-medium">{spec.nfrs.responseTime}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Throughput</p>
                      <p className="font-medium">{spec.nfrs.throughput}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Support Hours</p>
                      <p className="font-medium">{spec.nfrs.supportHours}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={spec.nfrs.auditability ? 'default' : 'outline'}>
                      {spec.nfrs.auditability ? '✓ Auditability Required' : 'No Audit Requirements'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Acceptance Criteria */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Acceptance Criteria</CardTitle>
                <CardDescription>Generated test scenarios in Given-When-Then format</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {spec.acceptanceCriteria.map((ac) => (
                    <div key={ac.id} className="p-3 bg-muted/50 text-sm space-y-1">
                      <Badge variant="outline" className="mb-2">{ac.storyRef}</Badge>
                      <p><span className="font-medium text-success">Given</span> {ac.given}</p>
                      <p><span className="font-medium text-info">When</span> {ac.when}</p>
                      <p><span className="font-medium text-warning">Then</span> {ac.then}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Risks & Assumptions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Risks</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {spec.risks.map((risk) => (
                    <div key={risk.id} className="p-3 border border-border space-y-2">
                      <p className="text-sm font-medium">{risk.description}</p>
                      <div className="flex gap-2">
                        <Badge variant="outline">P: {risk.probability}</Badge>
                        <Badge variant="outline">I: {risk.impact}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Mitigation:</span> {risk.mitigation}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Assumptions & Open Questions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Assumptions</p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {spec.assumptions.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium mb-2">Open Questions</p>
                    <ul className="space-y-1">
                      {spec.openQuestions.map((q, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-warning">
                          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Transcript Tab */}
          <TabsContent value="transcript">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Interview Transcript</CardTitle>
                <CardDescription>Complete conversation history</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-4">
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
                            'max-w-[80%] p-3 text-sm',
                            msg.speaker === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-foreground'
                          )}
                        >
                          <p className="whitespace-pre-wrap">{msg.message}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Routing Tab */}
          <TabsContent value="routing">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Score Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(routing.scoreBreakdown).map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span className="font-medium">{value}/100</span>
                      </div>
                      <div className="h-2 bg-muted overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all"
                          style={{ width: `${value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Routing Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>{routing.explanationMarkdown}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
