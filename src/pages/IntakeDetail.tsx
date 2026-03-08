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
import { Skeleton } from '@/components/ui/skeleton';
import { useIntake, useTranscript, useSpec, useRoutingScore, useExportToJira, useUpdateIntakeStatus, useGenerateSpec, useJiraExport } from '@/hooks/useIntakes';
import { useApproval } from '@/hooks/useApprovals';
import { deliveryPathInfo } from '@/data/demo';
import { cn } from '@/lib/utils';
import { 
  ArrowLeft, FileText, MessageSquare, Route, CheckCircle, AlertTriangle,
  ExternalLink, Send, Clock, Users, Database, Plug, Smartphone, Shield,
  Loader2, Sparkles, BarChart3, History,
} from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { SpecAmendmentDialog } from '@/components/spec/SpecAmendmentDialog';
import { FollowupDialog } from '@/components/spec/FollowupDialog';
import { JiraSyncPanel } from '@/components/jira/JiraSyncPanel';
import { ImpactScoreCard } from '@/components/intake/ImpactScoreCard';
import { ApprovalDialog } from '@/components/intake/ApprovalDialog';

export default function IntakeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('spec');

  const { data: intake, isLoading: intakeLoading } = useIntake(id);
  const { data: transcript = [], isLoading: transcriptLoading } = useTranscript(id);
  const { data: specDoc, isLoading: specLoading } = useSpec(id);
  const { data: routing, isLoading: routingLoading } = useRoutingScore(id);
  const { data: jiraExport } = useJiraExport(id);
  const { data: approval } = useApproval(id);
  
  const exportToJira = useExportToJira();
  const updateStatus = useUpdateIntakeStatus();
  const generateSpec = useGenerateSpec();

  const spec = specDoc?.structured_json as any;
  const pathInfo = routing ? deliveryPathInfo[routing.path] : null;
  const canEditSpec = user?.role === 'architect' || user?.role === 'admin';
  const canRegenerate = user?.role === 'admin';
  const canApprove = (user?.role === 'architect' || user?.role === 'admin') && intake?.status === 'pending_approval';

  const handleExportToJira = async () => {
    if (!id) return;
    try {
      toast.loading('Exportiere nach Jira...', { id: 'jira-export' });
      await exportToJira.mutateAsync(id);
      toast.success('Erfolgreich nach Jira exportiert!', { id: 'jira-export', description: 'Epic und Stories wurden erstellt' });
    } catch (error) {
      toast.error('Export nach Jira fehlgeschlagen', { id: 'jira-export', description: error instanceof Error ? error.message : 'Unbekannter Fehler' });
    }
  };

  const handleRequestApproval = async () => {
    if (!id) return;
    try {
      await updateStatus.mutateAsync({ intakeId: id, status: 'pending_approval' });
      toast.success('Zur Genehmigung eingereicht', { description: 'Ein Architekt wird Ihren Intake prüfen' });
    } catch (error) {
      toast.error('Fehler beim Einreichen');
    }
  };

  const handleGenerateSpec = async () => {
    if (!id) return;
    try {
      toast.loading('Spezifikation wird mit KI generiert...', { id: 'generate-spec' });
      const result = await generateSpec.mutateAsync(id);
      const jiraBaseUrl = result?.jira?.jiraBaseUrl as string | undefined;
      if (jiraBaseUrl) localStorage.setItem('jira_base_url', jiraBaseUrl);
      toast.success('Spezifikation generiert!', {
        id: 'generate-spec',
        description: result?.jira?.jpdIssueKey
          ? `Jira: ${result.jira.jpdIssueKey} (${result.jira.action})`
          : 'KI hat das Transkript analysiert und eine strukturierte Spec erstellt',
      });
    } catch (error) {
      toast.error('Generierung fehlgeschlagen', { id: 'generate-spec', description: error instanceof Error ? error.message : 'Unbekannter Fehler' });
    }
  };

  if (intakeLoading) {
    return (
      <AppLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-12 w-1/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!intake) {
    return (
      <AppLayout>
        <div className="p-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">Intake nicht gefunden</p>
              <Button className="mt-4" onClick={() => navigate('/dashboard')}>Zum Dashboard</Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0 flex-1">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="flex-shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-2 mb-1 flex-wrap">
                {intake.jpd_issue_key && (
                  <a
                    href={`${localStorage.getItem('jira_base_url') || 'https://prodive.atlassian.net'}/browse/${intake.jpd_issue_key}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-sm text-primary hover:underline flex-shrink-0"
                  >
                    {intake.jpd_issue_key}
                  </a>
                )}
                <h1 className="text-2xl font-bold text-foreground break-words">{intake.title}</h1>
                <Badge variant={intake.status === 'pending_approval' ? 'default' : intake.status === 'approved' ? 'secondary' : 'outline'} className="flex-shrink-0">
                  {intake.status.replace(/_/g, ' ')}
                </Badge>
                {intake.priority && (
                  <Badge variant={intake.priority === 'critical' ? 'destructive' : intake.priority === 'high' ? 'default' : 'outline'} className="capitalize">
                    {intake.priority}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">
                {intake.value_stream} • {intake.category} • Erstellt am {new Date(intake.created_at).toLocaleDateString('de-DE')}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            {/* Follow-up button for architects */}
            {canEditSpec && id && (
              <FollowupDialog intakeId={id} intakeTitle={intake.title} />
            )}
            {intake.status === 'gathering_info' && transcript.length > 0 && !spec && (
              <Button onClick={handleGenerateSpec} disabled={generateSpec.isPending}>
                {generateSpec.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Spec generieren
              </Button>
            )}
            {intake.status === 'spec_generated' && (
              <Button onClick={handleRequestApproval} disabled={updateStatus.isPending}>
                {updateStatus.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Zur Genehmigung
              </Button>
            )}
            {canApprove && id && (
              <ApprovalDialog intakeId={id} intakeTitle={intake.title} routingPath={routing?.path} />
            )}
            {intake.status === 'approved' && (
              <Button onClick={handleExportToJira} disabled={exportToJira.isPending}>
                {exportToJira.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
                Nach Jira exportieren
              </Button>
            )}
          </div>
        </div>

        {/* Approval Banner */}
        {approval && (
          <Card className={cn(
            'border-2',
            approval.decision === 'approved' ? 'border-success bg-success/5' : 
            approval.decision === 'rejected' ? 'border-destructive bg-destructive/5' : 'border-warning bg-warning/5'
          )}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {approval.decision === 'approved' ? (
                  <CheckCircle className="h-5 w-5 text-success" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                )}
                <div>
                  <p className="font-medium capitalize">{approval.decision === 'approved' ? 'Genehmigt' : approval.decision === 'rejected' ? 'Abgelehnt' : 'Überarbeitung'}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(approval.decided_at).toLocaleString('de-DE')}
                    {approval.comments && ` — ${approval.comments}`}
                  </p>
                </div>
              </div>
              {approval.guardrails_json && (
                <div className="flex gap-2 flex-wrap">
                  {(approval.guardrails_json as any).requiredTests?.map((t: string) => (
                    <Badge key={t} variant="outline" className="text-xs capitalize">{t}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Jira Sync Panel */}
        {id && (intake.jpd_issue_key || jiraExport) && (
          <JiraSyncPanel intakeId={id} jpdIssueKey={intake.jpd_issue_key} autoRefreshInterval={30000} />
        )}

        {/* Impact Score */}
        {id && <ImpactScoreCard intakeId={id} />}

        {/* Routing Summary Card */}
        {routing && pathInfo && (
          <Card className="border-2" style={{ borderColor: `hsl(var(--${pathInfo.color}))` }}>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 flex items-center justify-center text-primary-foreground font-bold" style={{ backgroundColor: `hsl(var(--${pathInfo.color}))` }}>
                    <Route className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Empfohlener Delivery Path</p>
                    <p className="text-xl font-bold">{pathInfo.label}</p>
                    <p className="text-sm text-muted-foreground">{pathInfo.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold">{routing.score}</p>
                    <p className="text-xs text-muted-foreground">Complexity Score</p>
                  </div>
                  <Button variant="outline" onClick={() => setActiveTab('routing')}>Analyse anzeigen</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="spec" className="gap-2"><FileText className="h-4 w-4" />Spezifikation</TabsTrigger>
            <TabsTrigger value="transcript" className="gap-2"><MessageSquare className="h-4 w-4" />Transkript</TabsTrigger>
            <TabsTrigger value="routing" className="gap-2"><Route className="h-4 w-4" />Routing</TabsTrigger>
          </TabsList>

          {/* Specification Tab */}
          <TabsContent value="spec" className="space-y-6">
            {specLoading ? (
              <div className="space-y-4"><Skeleton className="h-48 w-full" /><Skeleton className="h-48 w-full" /></div>
            ) : !spec ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">Noch keine Spezifikation generiert</p>
                  {transcript.length > 0 && (
                    <Button onClick={handleGenerateSpec} disabled={generateSpec.isPending}>
                      {generateSpec.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                      Mit KI generieren
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Spec Actions */}
                {(canEditSpec || canRegenerate) && specDoc && (
                  <div className="flex justify-end gap-2">
                    {canRegenerate && (
                      <Button variant="outline" size="sm" onClick={handleGenerateSpec} disabled={generateSpec.isPending}>
                        {generateSpec.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        Neu generieren
                      </Button>
                    )}
                    {canEditSpec && id && <SpecAmendmentDialog intakeId={id} specId={specDoc.id} />}
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Problem & Goals */}
                  <Card>
                    <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Problemstellung</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm">{spec.problemStatement}</p>
                      {spec.currentProcess && (
                        <div><p className="text-sm font-medium mb-2">Aktueller Prozess</p><p className="text-sm text-muted-foreground">{spec.currentProcess}</p></div>
                      )}
                      {spec.painPoints?.length > 0 && (
                        <div><p className="text-sm font-medium mb-2">Schmerzpunkte</p>
                          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                            {spec.painPoints.map((pain: string, i: number) => <li key={i}>{pain}</li>)}
                          </ul>
                        </div>
                      )}
                      {spec.goals?.length > 0 && (
                        <div><p className="text-sm font-medium mb-2">Ziele</p>
                          <ul className="space-y-1">
                            {spec.goals.map((goal: string, i: number) => (
                              <li key={i} className="flex items-start gap-2 text-sm"><CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />{goal}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Users */}
                  <Card>
                    <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" />Benutzer & Nutzung</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      {spec.users?.length > 0 && (
                        <div className="space-y-2">
                          {spec.users.map((u: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-muted/50">
                              <span className="text-sm font-medium">{u.persona}</span>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{u.count} Nutzer</Badge>
                                <Badge variant="secondary">{u.techLevel}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <Separator />
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {spec.frequency && <div><p className="text-muted-foreground">Häufigkeit</p><p className="font-medium">{spec.frequency}</p></div>}
                        {spec.volumes && <div><p className="text-muted-foreground">Volumen</p><p className="font-medium">{spec.volumes}</p></div>}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Data & Security */}
                  <Card>
                    <CardHeader><CardTitle className="text-base flex items-center gap-2"><Database className="h-4 w-4" />Daten & Sicherheit</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Klassifikation</span>
                        <Badge variant={spec.dataClassification === 'restricted' ? 'destructive' : 'secondary'}>{spec.dataClassification}</Badge>
                      </div>
                      {spec.retentionPeriod && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Aufbewahrung</span>
                          <span className="text-sm font-medium">{spec.retentionPeriod}</span>
                        </div>
                      )}
                      {spec.dataTypes?.length > 0 && (
                        <div><p className="text-sm text-muted-foreground mb-2">Datentypen</p>
                          <div className="flex flex-wrap gap-1">
                            {spec.dataTypes.map((type: string, i: number) => <Badge key={i} variant="outline" className="text-xs">{type}</Badge>)}
                          </div>
                        </div>
                      )}
                      {spec.privacyRequirements?.length > 0 && (
                        <div><p className="text-sm text-muted-foreground mb-2">Datenschutz</p>
                          <ul className="text-sm space-y-1">
                            {spec.privacyRequirements.map((req: string, i: number) => (
                              <li key={i} className="flex items-center gap-2"><Shield className="h-3 w-3 text-success" />{req}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Integrations */}
                  {spec.integrations?.length > 0 && (
                    <Card>
                      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plug className="h-4 w-4" />Integrationen</CardTitle></CardHeader>
                      <CardContent className="space-y-2">
                        {spec.integrations.map((int: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-muted/50">
                            <span className="text-sm font-medium">{int.system}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{int.type}</Badge>
                              <Badge variant={int.priority === 'must' ? 'default' : 'secondary'}>{int.priority}</Badge>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* UX Needs */}
                  {spec.uxNeeds?.length > 0 && (
                    <Card>
                      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Smartphone className="h-4 w-4" />UX-Anforderungen</CardTitle></CardHeader>
                      <CardContent className="space-y-2">
                        {spec.uxNeeds.map((ux: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-muted/50">
                            <div><span className="text-sm font-medium capitalize">{ux.type}</span><p className="text-xs text-muted-foreground">{ux.description}</p></div>
                            <Badge variant={ux.priority === 'must' ? 'default' : 'secondary'}>{ux.priority}</Badge>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* NFRs */}
                  {spec.nfrs && (
                    <Card>
                      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" />Nicht-funktionale Anforderungen</CardTitle></CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {spec.nfrs.availability && <div><p className="text-muted-foreground">Verfügbarkeit</p><p className="font-medium">{spec.nfrs.availability}</p></div>}
                          {spec.nfrs.responseTime && <div><p className="text-muted-foreground">Antwortzeit</p><p className="font-medium">{spec.nfrs.responseTime}</p></div>}
                          {spec.nfrs.throughput && <div><p className="text-muted-foreground">Durchsatz</p><p className="font-medium">{spec.nfrs.throughput}</p></div>}
                          {spec.nfrs.supportHours && <div><p className="text-muted-foreground">Support-Zeiten</p><p className="font-medium">{spec.nfrs.supportHours}</p></div>}
                        </div>
                        {spec.nfrs.auditability !== undefined && (
                          <Badge variant={spec.nfrs.auditability ? 'default' : 'outline'}>
                            {spec.nfrs.auditability ? '✓ Audit-Pflicht' : 'Kein Audit nötig'}
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Acceptance Criteria */}
                {spec.acceptanceCriteria?.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="text-base">Akzeptanzkriterien</CardTitle><CardDescription>Generierte Testszenarien im Given-When-Then Format</CardDescription></CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {spec.acceptanceCriteria.map((ac: any) => (
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
                )}

                {/* Risks & Assumptions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {spec.risks?.length > 0 && (
                    <Card>
                      <CardHeader><CardTitle className="text-base">Risiken</CardTitle></CardHeader>
                      <CardContent className="space-y-3">
                        {spec.risks.map((risk: any) => (
                          <div key={risk.id} className="p-3 border border-border space-y-2">
                            <p className="text-sm font-medium">{risk.description}</p>
                            <div className="flex gap-2">
                              <Badge variant="outline">W: {risk.probability}</Badge>
                              <Badge variant="outline">A: {risk.impact}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground"><span className="font-medium">Maßnahme:</span> {risk.mitigation}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader><CardTitle className="text-base">Annahmen & Offene Fragen</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      {spec.assumptions?.length > 0 && (
                        <div><p className="text-sm font-medium mb-2">Annahmen</p>
                          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                            {spec.assumptions.map((a: string, i: number) => <li key={i}>{a}</li>)}
                          </ul>
                        </div>
                      )}
                      {spec.assumptions?.length > 0 && spec.openQuestions?.length > 0 && <Separator />}
                      {spec.openQuestions?.length > 0 && (
                        <div><p className="text-sm font-medium mb-2">Offene Fragen</p>
                          <ul className="space-y-1">
                            {spec.openQuestions.map((q: string, i: number) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-warning"><AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />{q}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* Transcript Tab */}
          <TabsContent value="transcript">
            <Card>
              <CardHeader><CardTitle className="text-base">Interview-Transkript</CardTitle><CardDescription>Vollständiger Gesprächsverlauf</CardDescription></CardHeader>
              <CardContent>
                {transcriptLoading ? (
                  <div className="space-y-4"><Skeleton className="h-16 w-3/4" /><Skeleton className="h-16 w-2/3 ml-auto" /><Skeleton className="h-16 w-3/4" /></div>
                ) : transcript.length === 0 ? (
                  <div className="text-center py-12"><MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">Noch kein Transkript vorhanden</p></div>
                ) : (
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-4">
                      {transcript.map((msg) => (
                        <div key={msg.id} className={cn('flex', msg.speaker === 'user' ? 'justify-end' : 'justify-start')}>
                          <div className={cn('max-w-[80%] p-3 text-sm rounded-lg', msg.speaker === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground')}>
                            <p className="whitespace-pre-wrap">{msg.message}</p>
                            <p className="text-xs opacity-70 mt-1">{new Date(msg.timestamp).toLocaleTimeString('de-DE')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Routing Tab */}
          <TabsContent value="routing">
            {routingLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
            ) : !routing ? (
              <Card><CardContent className="pt-6 text-center py-12"><Route className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">Noch keine Routing-Analyse vorhanden</p></CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle className="text-base">Score-Aufschlüsselung</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    {routing.score_json && typeof routing.score_json === 'object' && 
                      Object.entries(routing.score_json as Record<string, number>).map(([key, value]) => (
                        <div key={key} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                            <span className="font-medium">{value}/100</span>
                          </div>
                          <div className="h-2 bg-muted overflow-hidden rounded-full">
                            <div className="h-full bg-primary transition-all rounded-full" style={{ width: `${value}%` }} />
                          </div>
                        </div>
                      ))
                    }
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-base">Routing-Analyse</CardTitle></CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown>{routing.explanation_markdown || ''}</ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
