// Core types for AI Intake Router

export type UserRole = 'requester' | 'architect' | 'engineer_lead' | 'admin';

export type IntakeStatus = 
  | 'draft'
  | 'gathering_info'
  | 'spec_generated'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'exported'
  | 'closed';

export type DeliveryPath = 
  | 'BUY'
  | 'CONFIG'
  | 'AI_DISPOSABLE'
  | 'PRODUCT_GRADE'
  | 'CRITICAL';

export type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted';

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface Intake {
  id: string;
  title: string;
  status: IntakeStatus;
  requesterId: string;
  requesterName: string;
  createdAt: string;
  updatedAt: string;
  valueStream?: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export interface TranscriptMessage {
  id: string;
  intakeId: string;
  speaker: 'user' | 'assistant' | 'system';
  message: string;
  timestamp: string;
  questionKey?: string;
}

export interface SpecDocument {
  id: string;
  intakeId: string;
  version: number;
  structuredJson: StructuredSpec;
  markdown: string;
  createdBy: string;
  createdAt: string;
}

export interface StructuredSpec {
  problemStatement: string;
  currentProcess: string;
  painPoints: string[];
  goals: string[];
  constraints: string[];
  users: UserDefinition[];
  frequency: string;
  volumes: string;
  environments: string[];
  dataTypes: string[];
  dataClassification: DataClassification;
  retentionPeriod: string;
  privacyRequirements: string[];
  integrations: IntegrationNeed[];
  uxNeeds: UxRequirement[];
  nfrs: NonFunctionalRequirements;
  acceptanceCriteria: AcceptanceCriterion[];
  testSuggestions: TestSuggestion[];
  risks: Risk[];
  assumptions: string[];
  openQuestions: string[];
}

export interface UserDefinition {
  persona: string;
  count: string;
  techLevel: 'non-technical' | 'technical' | 'mixed';
}

export interface IntegrationNeed {
  system: string;
  type: 'read' | 'write' | 'bidirectional';
  priority: 'must' | 'should' | 'could';
}

export interface UxRequirement {
  type: 'mobile' | 'scanner' | 'offline' | 'accessibility' | 'dashboard' | 'other';
  description: string;
  priority: 'must' | 'should' | 'could';
}

export interface NonFunctionalRequirements {
  availability: string;
  responseTime: string;
  throughput: string;
  auditability: boolean;
  supportHours: string;
  dataRetention: string;
}

export interface AcceptanceCriterion {
  id: string;
  storyRef: string;
  given: string;
  when: string;
  then: string;
}

export interface TestSuggestion {
  id: string;
  type: 'unit' | 'integration' | 'e2e' | 'security' | 'performance';
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export interface Risk {
  id: string;
  description: string;
  probability: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  mitigation: string;
}

export interface RoutingScore {
  id: string;
  intakeId: string;
  path: DeliveryPath;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  explanationMarkdown: string;
}

export interface ScoreBreakdown {
  dataComplexity: number;
  integrationComplexity: number;
  userScale: number;
  securityRequirements: number;
  availabilityRequirements: number;
  customizationNeeds: number;
  timeToMarket: number;
}

export interface Approval {
  id: string;
  intakeId: string;
  architectId: string;
  architectName: string;
  decision: 'approved' | 'rejected' | 'needs_revision';
  guardrails: Guardrails;
  decidedAt: string;
  comments?: string;
}

export interface Guardrails {
  dataZone: 'green' | 'yellow' | 'red';
  allowedTechnologies: string[];
  requiredTests: ('unit' | 'integration' | 'e2e' | 'security' | 'performance')[];
  requiredReviews: ('code' | 'architecture' | 'security' | 'data')[];
  releaseGates: string[];
}

export interface JiraExport {
  id: string;
  intakeId: string;
  jpdIssueKey?: string;
  epicKey?: string;
  jsmRequestKey?: string;
  status: 'pending' | 'in_progress' | 'success' | 'failed';
  logs: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

// Interview question structure
export interface InterviewQuestion {
  key: string;
  category: 'problem' | 'users' | 'data' | 'integrations' | 'ux' | 'nfr';
  question: string;
  helpText?: string;
  inputType: 'text' | 'textarea' | 'select' | 'multiselect' | 'number';
  options?: string[];
  required: boolean;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}
