// Demo data for Frau Meier warehouse scenario
import type { 
  Intake, 
  TranscriptMessage, 
  StructuredSpec, 
  RoutingScore, 
  User,
  InterviewQuestion
} from '@/types/intake';

export const demoUsers: User[] = [
  {
    id: 'user-1',
    email: 'maria.meier@example.com',
    displayName: 'Frau Maria Meier',
    role: 'requester',
  },
  {
    id: 'user-2',
    email: 'thomas.architect@example.com',
    displayName: 'Thomas Weber',
    role: 'architect',
  },
  {
    id: 'user-3',
    email: 'admin@example.com',
    displayName: 'System Admin',
    role: 'admin',
  },
];

export const demoIntakes: Intake[] = [
  {
    id: 'intake-1',
    title: 'Warehouse Item Tracking via Barcode/QR',
    status: 'pending_approval',
    requesterId: 'user-1',
    requesterName: 'Frau Maria Meier',
    createdAt: '2024-01-15T09:30:00Z',
    updatedAt: '2024-01-15T14:22:00Z',
    valueStream: 'Operations',
    category: 'Inventory Management',
    priority: 'high',
  },
  {
    id: 'intake-2',
    title: 'Customer Feedback Portal',
    status: 'draft',
    requesterId: 'user-1',
    requesterName: 'Frau Maria Meier',
    createdAt: '2024-01-14T11:00:00Z',
    updatedAt: '2024-01-14T11:00:00Z',
    valueStream: 'Customer Success',
    category: 'Customer Experience',
    priority: 'medium',
  },
  {
    id: 'intake-3',
    title: 'Supplier Invoice Automation',
    status: 'approved',
    requesterId: 'user-1',
    requesterName: 'Frau Maria Meier',
    createdAt: '2024-01-10T08:15:00Z',
    updatedAt: '2024-01-12T16:45:00Z',
    valueStream: 'Finance',
    category: 'Process Automation',
    priority: 'medium',
  },
];

export const demoTranscript: TranscriptMessage[] = [
  {
    id: 'msg-1',
    intakeId: 'intake-1',
    speaker: 'assistant',
    message: 'Hello Frau Meier! I\'m here to help you document your software need. Let\'s start with the basics. What problem are you trying to solve?',
    timestamp: '2024-01-15T09:30:00Z',
    questionKey: 'problem_statement',
  },
  {
    id: 'msg-2',
    intakeId: 'intake-1',
    speaker: 'user',
    message: 'We need to track items in our warehouse. Currently, we use paper lists and it\'s a mess. Items get lost, we can\'t find them quickly, and inventory counts are always wrong.',
    timestamp: '2024-01-15T09:31:00Z',
  },
  {
    id: 'msg-3',
    intakeId: 'intake-1',
    speaker: 'assistant',
    message: 'I understand - paper-based tracking is causing lost items and inaccurate inventory. How do you currently track where items are located in the warehouse?',
    timestamp: '2024-01-15T09:31:30Z',
    questionKey: 'current_process',
  },
  {
    id: 'msg-4',
    intakeId: 'intake-1',
    speaker: 'user',
    message: 'Warehouse workers write down the location on paper when they move items. But they often forget, or the paper gets lost. We need barcode or QR code scanning to make it foolproof.',
    timestamp: '2024-01-15T09:32:00Z',
  },
  {
    id: 'msg-5',
    intakeId: 'intake-1',
    speaker: 'assistant',
    message: 'Perfect - you want to replace paper with barcode/QR scanning for reliable tracking. Who will be using this system? How many people and what\'s their technical comfort level?',
    timestamp: '2024-01-15T09:32:30Z',
    questionKey: 'users',
  },
  {
    id: 'msg-6',
    intakeId: 'intake-1',
    speaker: 'user',
    message: 'About 25 warehouse workers across 2 shifts. They\'re not technical - they use smartphones but nothing complicated. We also have 3 inventory managers who need to see reports.',
    timestamp: '2024-01-15T09:33:00Z',
  },
  {
    id: 'msg-7',
    intakeId: 'intake-1',
    speaker: 'assistant',
    message: 'Got it - 25 non-technical warehouse workers plus 3 managers. What kind of data will you be tracking? Any sensitive or personal information?',
    timestamp: '2024-01-15T09:33:30Z',
    questionKey: 'data_classification',
  },
  {
    id: 'msg-8',
    intakeId: 'intake-1',
    speaker: 'user',
    message: 'Just product information - item codes, descriptions, locations, timestamps of movements. Nothing personal. But we need to keep records for audits - at least 2 years.',
    timestamp: '2024-01-15T09:34:00Z',
  },
];

export const demoSpec: StructuredSpec = {
  problemStatement: 'Paper-based warehouse tracking leads to lost items, inaccurate inventory counts, and inability to locate items quickly.',
  currentProcess: 'Workers manually write item locations on paper when moving items. Papers frequently get lost or workers forget to update them.',
  painPoints: [
    'Items frequently get lost or misplaced',
    'Inventory counts are inaccurate',
    'Cannot quickly locate items when needed',
    'Paper records are unreliable and often lost',
    'No audit trail for item movements',
  ],
  goals: [
    'Enable real-time item location tracking via barcode/QR scanning',
    'Achieve 99% inventory accuracy',
    'Reduce time to locate items by 80%',
    'Maintain complete audit trail of all movements',
  ],
  constraints: [
    'Must work on standard smartphones (no special devices)',
    'Workers have limited technical skills',
    'Warehouse has spotty WiFi in some areas',
  ],
  users: [
    { persona: 'Warehouse Worker', count: '25', techLevel: 'non-technical' },
    { persona: 'Inventory Manager', count: '3', techLevel: 'mixed' },
  ],
  frequency: 'Continuous - approximately 500 scans per day',
  volumes: '10,000 items, 500 daily scans, 2 warehouses',
  environments: ['Mobile (Android/iOS)', 'Web dashboard'],
  dataTypes: ['Item codes', 'Product descriptions', 'Location codes', 'Timestamps', 'Worker IDs'],
  dataClassification: 'internal',
  retentionPeriod: '2 years',
  privacyRequirements: ['No personal data collected', 'Worker IDs for audit only'],
  integrations: [
    { system: 'SAP ERP', type: 'bidirectional', priority: 'must' },
    { system: 'Label Printer', type: 'write', priority: 'should' },
  ],
  uxNeeds: [
    { type: 'mobile', description: 'Primary interface is mobile scanning', priority: 'must' },
    { type: 'scanner', description: 'Camera-based barcode/QR scanning', priority: 'must' },
    { type: 'offline', description: 'Queue scans when WiFi unavailable', priority: 'should' },
    { type: 'dashboard', description: 'Web dashboard for managers', priority: 'must' },
  ],
  nfrs: {
    availability: '99.5% during business hours (6am-10pm)',
    responseTime: 'Scan to confirmation < 2 seconds',
    throughput: '100 concurrent users',
    auditability: true,
    supportHours: 'Business hours with on-call for critical issues',
    dataRetention: '2 years',
  },
  acceptanceCriteria: [
    {
      id: 'ac-1',
      storyRef: 'SCAN-001',
      given: 'A warehouse worker with the mobile app open',
      when: 'They scan an item barcode and location QR code',
      then: 'The system records the item at that location with timestamp',
    },
    {
      id: 'ac-2',
      storyRef: 'SCAN-002',
      given: 'WiFi is unavailable',
      when: 'A worker scans an item',
      then: 'The scan is queued locally and synced when connection restores',
    },
    {
      id: 'ac-3',
      storyRef: 'DASH-001',
      given: 'An inventory manager views the dashboard',
      when: 'They search for an item by code',
      then: 'The system shows current location and movement history',
    },
  ],
  testSuggestions: [
    { id: 'test-1', type: 'e2e', description: 'Full scan workflow from app to SAP sync', priority: 'high' },
    { id: 'test-2', type: 'integration', description: 'Offline queue sync when connection restores', priority: 'high' },
    { id: 'test-3', type: 'performance', description: 'Load test with 100 concurrent scans', priority: 'medium' },
    { id: 'test-4', type: 'unit', description: 'Barcode validation and parsing logic', priority: 'medium' },
  ],
  risks: [
    {
      id: 'risk-1',
      description: 'WiFi coverage in warehouse may cause sync delays',
      probability: 'medium',
      impact: 'medium',
      mitigation: 'Implement robust offline queue with visual indicator',
    },
    {
      id: 'risk-2',
      description: 'SAP integration may have rate limits',
      probability: 'low',
      impact: 'high',
      mitigation: 'Batch updates and implement retry with backoff',
    },
  ],
  assumptions: [
    'Workers have company-provided or personal smartphones',
    'All items will have barcodes/QR codes',
    'Location zones will have QR codes installed',
    'SAP API access can be provisioned',
  ],
  openQuestions: [
    'What barcode format is currently on items?',
    'Is there existing location zone mapping?',
    'Who will manage label printing for new items?',
  ],
};

export const demoRoutingScore: RoutingScore = {
  id: 'route-1',
  intakeId: 'intake-1',
  path: 'CONFIG',
  score: 72,
  scoreBreakdown: {
    dataComplexity: 30,
    integrationComplexity: 65,
    userScale: 25,
    securityRequirements: 20,
    availabilityRequirements: 50,
    customizationNeeds: 40,
    timeToMarket: 70,
  },
  explanationMarkdown: `## Routing Recommendation: CONFIG (Low-Code Platform)

### Why CONFIG?

Based on the analysis of your requirements, we recommend a **low-code platform approach** for the following reasons:

#### Factors Favoring CONFIG:
- **Standard Use Case**: Inventory tracking is a well-established pattern
- **Limited Integrations**: Only SAP and label printing required
- **Moderate Data Volume**: 500 daily scans is manageable
- **Standard Security**: Internal data classification, no PII
- **Time to Market**: Business needs quick delivery

#### Factors Considered:
| Factor | Score | Impact |
|--------|-------|--------|
| Data Complexity | Low (30) | Favors CONFIG |
| Integration Complexity | Medium (65) | SAP requires attention |
| User Scale | Low (25) | 28 users manageable |
| Security Requirements | Low (20) | No special needs |
| Availability | Medium (50) | 99.5% achievable |

### Alternative Paths Considered:
- **AI_DISPOSABLE**: Rejected - needs long-term support
- **PRODUCT_GRADE**: Could work, but overkill for scope
- **BUY**: No perfect COTS fit found

### Recommended Platform Options:
1. Power Apps + Power Automate
2. Mendix
3. OutSystems

### Next Steps:
1. Architect to validate platform choice
2. Evaluate SAP connector availability
3. Proof of concept for offline scanning`,
};

export const categoryLabels: Record<string, string> = {
  problem: 'Problem & Ziele',
  users: 'Benutzer & Nutzung',
  data: 'Daten & Sicherheit',
  integrations: 'Integrationen',
  ux: 'Benutzeroberfläche',
  nfr: 'Anforderungen',
};

export const interviewQuestions: InterviewQuestion[] = [
  {
    key: 'problem_statement',
    category: 'problem',
    question: 'What problem are you trying to solve? Describe the challenge in your own words.',
    helpText: 'Think about what\'s not working today and why it matters',
    inputType: 'textarea',
    required: true,
    validation: { minLength: 20, maxLength: 2000 },
  },
  {
    key: 'current_process',
    category: 'problem',
    question: 'How do you handle this today? Walk me through the current process.',
    helpText: 'Include any tools, spreadsheets, or workarounds you use',
    inputType: 'textarea',
    required: true,
    validation: { minLength: 20, maxLength: 2000 },
  },
  {
    key: 'pain_points',
    category: 'problem',
    question: 'What are the main pain points or frustrations?',
    helpText: 'List the top issues you face with the current approach',
    inputType: 'textarea',
    required: true,
  },
  {
    key: 'goals',
    category: 'problem',
    question: 'What would success look like? What outcomes do you want to achieve?',
    helpText: 'Be specific - include numbers or metrics if possible',
    inputType: 'textarea',
    required: true,
  },
  {
    key: 'users_primary',
    category: 'users',
    question: 'Who will be the main users of this solution?',
    helpText: 'Describe their role and how many people',
    inputType: 'textarea',
    required: true,
  },
  {
    key: 'users_tech_level',
    category: 'users',
    question: 'What is the technical comfort level of your users?',
    inputType: 'select',
    options: ['Non-technical (basic smartphone/computer)', 'Mixed (some technical, some not)', 'Technical (comfortable with complex software)'],
    required: true,
  },
  {
    key: 'frequency',
    category: 'users',
    question: 'How often will this be used? (daily, weekly, monthly)',
    inputType: 'text',
    required: true,
  },
  {
    key: 'data_types',
    category: 'data',
    question: 'What types of data will you be working with?',
    helpText: 'e.g., customer info, product data, financial records',
    inputType: 'textarea',
    required: true,
  },
  {
    key: 'data_classification',
    category: 'data',
    question: 'What is the sensitivity level of this data?',
    inputType: 'select',
    options: ['Public - Anyone can see', 'Internal - Company employees only', 'Confidential - Limited access required', 'Restricted - Highest security needed'],
    required: true,
  },
  {
    key: 'retention',
    category: 'data',
    question: 'How long do records need to be kept?',
    inputType: 'select',
    options: ['Less than 1 year', '1-2 years', '3-5 years', '5-10 years', '10+ years'],
    required: true,
  },
  {
    key: 'integrations',
    category: 'integrations',
    question: 'What other systems does this need to connect with?',
    helpText: 'e.g., SAP, Salesforce, email systems, databases',
    inputType: 'textarea',
    required: false,
  },
  {
    key: 'mobile_needed',
    category: 'ux',
    question: 'Do users need mobile access?',
    inputType: 'select',
    options: ['Yes, mobile is primary', 'Yes, but desktop is primary', 'No, desktop only'],
    required: true,
  },
  {
    key: 'offline_needed',
    category: 'ux',
    question: 'Does it need to work offline or with poor connectivity?',
    inputType: 'select',
    options: ['Yes, must work offline', 'Nice to have, not critical', 'No, always connected'],
    required: true,
  },
  {
    key: 'availability',
    category: 'nfr',
    question: 'When does this need to be available?',
    inputType: 'select',
    options: ['Business hours only', 'Extended hours (6am-10pm)', '24/7 availability'],
    required: true,
  },
  {
    key: 'timeline',
    category: 'nfr',
    question: 'When do you need this? What\'s driving the timeline?',
    inputType: 'textarea',
    required: true,
  },
];

export const deliveryPathInfo: Record<string, { label: string; description: string; color: string }> = {
  BUY: {
    label: 'Buy',
    description: 'Purchase a commercial off-the-shelf solution',
    color: 'path-buy',
  },
  CONFIG: {
    label: 'Configure',
    description: 'Build using low-code/no-code platform',
    color: 'path-config',
  },
  AI_DISPOSABLE: {
    label: 'AI Disposable',
    description: 'Quick AI-built solution with limited lifespan',
    color: 'path-ai-disposable',
  },
  PRODUCT_GRADE: {
    label: 'Product Grade',
    description: 'Full custom development with production standards',
    color: 'path-product',
  },
  CRITICAL: {
    label: 'Critical',
    description: 'Mission-critical system requiring highest standards',
    color: 'path-critical',
  },
};
