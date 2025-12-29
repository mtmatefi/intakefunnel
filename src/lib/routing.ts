// Routing logic for determining delivery path
import type { StructuredSpec, DeliveryPath, ScoreBreakdown } from '@/types/intake';

interface RoutingResult {
  path: DeliveryPath;
  score: number;
  breakdown: ScoreBreakdown;
  explanation: string;
}

export function calculateRoutingScore(spec: StructuredSpec): RoutingResult {
  const breakdown: ScoreBreakdown = {
    dataComplexity: calculateDataComplexity(spec),
    integrationComplexity: calculateIntegrationComplexity(spec),
    userScale: calculateUserScale(spec),
    securityRequirements: calculateSecurityRequirements(spec),
    availabilityRequirements: calculateAvailabilityRequirements(spec),
    customizationNeeds: calculateCustomizationNeeds(spec),
    timeToMarket: 50, // Default, would come from interview
  };

  const totalScore = Object.values(breakdown).reduce((a, b) => a + b, 0) / Object.keys(breakdown).length;
  const path = determinePathFromScore(breakdown, spec);
  const explanation = generateExplanation(path, breakdown, spec);

  return { path, score: Math.round(totalScore), breakdown, explanation };
}

function calculateDataComplexity(spec: StructuredSpec): number {
  let score = 20;
  
  // More data types = more complexity
  score += spec.dataTypes.length * 5;
  
  // Higher classification = more complexity
  const classificationScores = {
    public: 0,
    internal: 10,
    confidential: 25,
    restricted: 40,
  };
  score += classificationScores[spec.dataClassification] || 0;
  
  // Privacy requirements add complexity
  score += spec.privacyRequirements.length * 5;
  
  return Math.min(score, 100);
}

function calculateIntegrationComplexity(spec: StructuredSpec): number {
  let score = 10;
  
  // Each integration adds complexity
  spec.integrations.forEach(int => {
    const typeScores = { read: 10, write: 15, bidirectional: 25 };
    score += typeScores[int.type];
    
    // Must-have integrations add more weight
    if (int.priority === 'must') score += 10;
  });
  
  return Math.min(score, 100);
}

function calculateUserScale(spec: StructuredSpec): number {
  const totalUsers = spec.users.reduce((sum, u) => sum + parseInt(u.count) || 0, 0);
  
  if (totalUsers < 10) return 10;
  if (totalUsers < 50) return 25;
  if (totalUsers < 200) return 50;
  if (totalUsers < 1000) return 75;
  return 100;
}

function calculateSecurityRequirements(spec: StructuredSpec): number {
  let score = 10;
  
  const classificationScores = {
    public: 0,
    internal: 15,
    confidential: 40,
    restricted: 70,
  };
  score += classificationScores[spec.dataClassification] || 0;
  
  if (spec.nfrs.auditability) score += 15;
  
  return Math.min(score, 100);
}

function calculateAvailabilityRequirements(spec: StructuredSpec): number {
  const availability = spec.nfrs.availability.toLowerCase();
  
  if (availability.includes('24/7') || availability.includes('99.9')) return 90;
  if (availability.includes('99.5')) return 60;
  if (availability.includes('business hours')) return 30;
  
  return 40;
}

function calculateCustomizationNeeds(spec: StructuredSpec): number {
  let score = 20;
  
  // UX needs indicate customization
  score += spec.uxNeeds.filter(u => u.priority === 'must').length * 10;
  
  // Complex acceptance criteria
  score += Math.min(spec.acceptanceCriteria.length * 5, 30);
  
  return Math.min(score, 100);
}

function determinePathFromScore(breakdown: ScoreBreakdown, spec: StructuredSpec): DeliveryPath {
  const avgScore = Object.values(breakdown).reduce((a, b) => a + b, 0) / Object.keys(breakdown).length;
  
  // Check for CRITICAL indicators
  if (
    spec.dataClassification === 'restricted' ||
    breakdown.securityRequirements > 80 ||
    breakdown.availabilityRequirements > 85
  ) {
    return 'CRITICAL';
  }
  
  // Check for PRODUCT_GRADE indicators
  if (
    avgScore > 60 ||
    breakdown.integrationComplexity > 70 ||
    breakdown.customizationNeeds > 70
  ) {
    return 'PRODUCT_GRADE';
  }
  
  // Check for AI_DISPOSABLE candidates
  if (
    avgScore < 35 &&
    breakdown.integrationComplexity < 30 &&
    breakdown.userScale < 30 &&
    breakdown.timeToMarket > 70
  ) {
    return 'AI_DISPOSABLE';
  }
  
  // Check for BUY candidates
  if (
    breakdown.customizationNeeds < 30 &&
    breakdown.integrationComplexity < 40
  ) {
    return 'BUY';
  }
  
  // Default to CONFIG for moderate complexity
  return 'CONFIG';
}

function generateExplanation(path: DeliveryPath, breakdown: ScoreBreakdown, spec: StructuredSpec): string {
  const pathLabels: Record<DeliveryPath, string> = {
    BUY: 'Buy (Commercial Off-the-Shelf)',
    CONFIG: 'Configure (Low-Code Platform)',
    AI_DISPOSABLE: 'AI Disposable',
    PRODUCT_GRADE: 'Product Grade Development',
    CRITICAL: 'Critical System Development',
  };

  let explanation = `## Routing Recommendation: ${pathLabels[path]}\n\n`;
  
  explanation += `### Score Summary\n\n`;
  explanation += `| Factor | Score | Level |\n`;
  explanation += `|--------|-------|-------|\n`;
  explanation += `| Data Complexity | ${breakdown.dataComplexity} | ${getLevel(breakdown.dataComplexity)} |\n`;
  explanation += `| Integration Complexity | ${breakdown.integrationComplexity} | ${getLevel(breakdown.integrationComplexity)} |\n`;
  explanation += `| User Scale | ${breakdown.userScale} | ${getLevel(breakdown.userScale)} |\n`;
  explanation += `| Security Requirements | ${breakdown.securityRequirements} | ${getLevel(breakdown.securityRequirements)} |\n`;
  explanation += `| Availability Requirements | ${breakdown.availabilityRequirements} | ${getLevel(breakdown.availabilityRequirements)} |\n`;
  explanation += `| Customization Needs | ${breakdown.customizationNeeds} | ${getLevel(breakdown.customizationNeeds)} |\n\n`;
  
  explanation += `### Key Factors\n\n`;
  
  if (path === 'CONFIG') {
    explanation += `- Standard use case suitable for low-code approach\n`;
    explanation += `- Moderate integration complexity\n`;
    explanation += `- Reasonable time-to-market expectations\n`;
  } else if (path === 'PRODUCT_GRADE') {
    explanation += `- Complex customization requirements\n`;
    explanation += `- Multiple integrations needed\n`;
    explanation += `- Long-term maintainability important\n`;
  } else if (path === 'CRITICAL') {
    explanation += `- High security/compliance requirements\n`;
    explanation += `- Mission-critical availability needed\n`;
    explanation += `- Requires extensive testing and validation\n`;
  } else if (path === 'AI_DISPOSABLE') {
    explanation += `- Simple, well-defined scope\n`;
    explanation += `- Limited lifespan acceptable\n`;
    explanation += `- Speed to delivery is priority\n`;
  } else if (path === 'BUY') {
    explanation += `- Standard requirements that COTS can satisfy\n`;
    explanation += `- Limited customization needed\n`;
    explanation += `- Cost-effective for scope\n`;
  }
  
  if (spec.risks.length > 0) {
    explanation += `\n### Identified Risks\n\n`;
    spec.risks.forEach(risk => {
      explanation += `- **${risk.description}** (${risk.probability} probability, ${risk.impact} impact)\n`;
    });
  }
  
  return explanation;
}

function getLevel(score: number): string {
  if (score < 30) return 'Low';
  if (score < 60) return 'Medium';
  return 'High';
}

// AI Provider interface for spec generation
export interface AIProvider {
  name: string;
  generateSpec: (transcript: string) => Promise<StructuredSpec>;
  generateJiraPayload: (spec: StructuredSpec) => Promise<JiraPayload>;
}

export interface JiraPayload {
  idea: {
    summary: string;
    description: string;
    fields: Record<string, unknown>;
  };
  epic: {
    summary: string;
    description: string;
  };
  stories: Array<{
    summary: string;
    description: string;
    acceptanceCriteria: string;
  }>;
}

// Placeholder AI provider - would be replaced with actual implementation
export const defaultAIProvider: AIProvider = {
  name: 'default',
  generateSpec: async (_transcript: string) => {
    // In production, this would call OpenAI/Anthropic/Azure
    throw new Error('AI provider not configured. Set VITE_AI_PROVIDER environment variable.');
  },
  generateJiraPayload: async (_spec: StructuredSpec) => {
    throw new Error('AI provider not configured. Set VITE_AI_PROVIDER environment variable.');
  },
};
