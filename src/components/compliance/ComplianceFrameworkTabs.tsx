import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Globe, Lock, FileText, Scale, AlertTriangle, Layers, Box, Server, GitBranch } from 'lucide-react';

export const COMPLIANCE_FRAMEWORKS = [
  { id: 'all', label: 'Alle', icon: FileText },
  // Compliance & Regulatory
  { id: 'itar', label: 'ITAR', icon: Shield },
  { id: 'ear_export', label: 'Export Control', icon: Globe },
  { id: 'gdpr', label: 'DSGVO/GDPR', icon: Scale },
  { id: 'iso27001', label: 'ISO 27001', icon: Shield },
  // Architecture
  { id: 'enterprise_arch', label: 'Enterprise Arch', icon: Layers },
  { id: 'solution_arch', label: 'Solution Arch', icon: Box },
  // Security & DevOps
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'devops', label: 'DevOps', icon: GitBranch },
  // Other
  { id: 'risk_management', label: 'Risiko', icon: AlertTriangle },
  { id: 'general', label: 'Allgemein', icon: FileText },
] as const;

export type ComplianceFramework = typeof COMPLIANCE_FRAMEWORKS[number]['id'];

// Domain-specific risk categories per framework
export const FRAMEWORK_RISK_CATEGORIES: Record<string, string[]> = {
  itar: [
    'Defense Articles', 'Technical Data', 'Export Licensing', 'Foreign Persons',
    'Brokering', 'Manufacturing License', 'Re-Export', 'Deemed Export',
  ],
  ear_export: [
    'ECCN Klassifizierung', 'License Exception', 'Denied Parties', 'End-Use Check',
    'De Minimis', 'Entity List', 'Sanctions Screening',
  ],
  gdpr: [
    'Verarbeitungsverzeichnis', 'Einwilligung', 'Betroffenenrechte', 'DSFA',
    'Auftragsverarbeitung', 'Datentransfer Drittland', 'TOM', 'Data Breach',
  ],
  iso27001: [
    'A.5 Informationssicherheitspolitik', 'A.6 Organisation', 'A.7 Personal',
    'A.8 Asset Management', 'A.9 Zugangskontrolle', 'A.10 Kryptographie',
    'A.12 Betriebssicherheit', 'A.13 Kommunikationssicherheit',
    'A.14 Systembeschaffung', 'A.18 Compliance',
  ],
  enterprise_arch: [
    'TOGAF ADM', 'Business Architecture', 'Data Architecture', 'Application Architecture',
    'Technology Architecture', 'Capability Mapping', 'Roadmap Alignment',
    'Portfolio Rationalisierung', 'Standards Compliance', 'Vendor Lock-in',
    'Technical Debt', 'Integration Complexity',
  ],
  solution_arch: [
    'Microservices vs Monolith', 'API Design', 'Data Model', 'Event-Driven',
    'CQRS/Event Sourcing', 'Domain-Driven Design', 'Scalability',
    'Performance SLA', 'Resilience Patterns', 'Integration Patterns',
    'Cloud-Native', 'Multi-Tenancy',
  ],
  security: [
    'OWASP Top 10', 'Zero Trust', 'IAM/RBAC', 'Encryption at Rest',
    'Encryption in Transit', 'Secret Management', 'Vulnerability Management',
    'Penetration Testing', 'SIEM/SOC', 'Incident Response',
    'Supply Chain Security', 'Container Security', 'API Security',
  ],
  devops: [
    'CI/CD Pipeline', 'Infrastructure as Code', 'GitOps', 'Observability',
    'SLI/SLO/SLA', 'Deployment Strategy', 'Feature Flags',
    'Chaos Engineering', 'Container Orchestration', 'Secret Rotation',
    'Artifact Management', 'Environment Parity', 'Rollback Strategy',
  ],
  risk_management: [
    'Strategisch', 'Operationell', 'Regulatorisch', 'Technologisch',
    'Drittanbieter', 'Reputationsrisiko', 'Finanziell',
  ],
  general: [
    'Datenklassifizierung', 'Zugangskontrolle', 'Audit-Trail',
    'Verfügbarkeit', 'Intellectual Property',
  ],
};

// Domain-specific guideline types
export const FRAMEWORK_TYPES: Record<string, { value: string; label: string }[]> = {
  enterprise_arch: [
    { value: 'architecture_principle', label: 'Architecture Principle' },
    { value: 'reference_architecture', label: 'Reference Architecture' },
    { value: 'technology_standard', label: 'Technology Standard' },
    { value: 'governance_policy', label: 'Governance Policy' },
    { value: 'decision_record', label: 'Architecture Decision Record' },
    { value: 'capability_model', label: 'Capability Model' },
  ],
  solution_arch: [
    { value: 'design_pattern', label: 'Design Pattern' },
    { value: 'api_standard', label: 'API Standard' },
    { value: 'integration_pattern', label: 'Integration Pattern' },
    { value: 'nfr_template', label: 'NFR Template' },
    { value: 'solution_blueprint', label: 'Solution Blueprint' },
    { value: 'decision_record', label: 'Architecture Decision Record' },
  ],
  security: [
    { value: 'security_policy', label: 'Security Policy' },
    { value: 'security_standard', label: 'Security Standard' },
    { value: 'threat_model', label: 'Threat Model Template' },
    { value: 'security_control', label: 'Security Control' },
    { value: 'incident_playbook', label: 'Incident Playbook' },
    { value: 'hardening_guide', label: 'Hardening Guide' },
  ],
  devops: [
    { value: 'pipeline_standard', label: 'Pipeline Standard' },
    { value: 'runbook', label: 'Runbook' },
    { value: 'slo_definition', label: 'SLO Definition' },
    { value: 'deployment_policy', label: 'Deployment Policy' },
    { value: 'iac_standard', label: 'IaC Standard' },
    { value: 'observability_standard', label: 'Observability Standard' },
  ],
  _default: [
    { value: 'policy', label: 'Policy' },
    { value: 'standard', label: 'Standard' },
    { value: 'procedure', label: 'Procedure' },
    { value: 'control', label: 'Control' },
    { value: 'checklist', label: 'Checklist' },
  ],
};

// AI prompt extensions per framework
export const FRAMEWORK_AI_CONTEXT: Record<string, string> = {
  itar: `Bei ITAR: Beachte ITAR §120-130, Defense Articles, Technical Data, Export Licensing.
Strukturiere nach: USML Categories, TAA Requirements, DDTC Registrierung, Compliance Program Elements.
Referenziere 22 CFR Parts 120-130.`,

  ear_export: `Bei Export Control: Beachte EAR 15 CFR Parts 730-774, CCL, ECCN Klassifizierung.
Strukturiere nach: Commerce Control List, License Exceptions, Screening Requirements, Record Keeping.
Referenziere BIS Guidelines und Entity List Procedures.`,

  gdpr: `Bei DSGVO: Beachte Art. 5-49 DSGVO, TOM nach Art. 32, DSFA nach Art. 35.
Strukturiere nach: Rechtsgrundlage, Betroffenenrechte, TOMs, Auftragsverarbeitung, Drittlandtransfer.
Referenziere EDPB Guidelines und BSI Grundschutz.`,

  iso27001: `Bei ISO 27001: Beachte Annex A Controls (ISO 27001:2022), Statement of Applicability.
Strukturiere nach: Control Objective, Control Description, Implementation Guidance, Evidence Requirements.
Referenziere ISO 27002:2022 für Implementierungsleitfaden.`,

  enterprise_arch: `Bei Enterprise Architecture: Nutze TOGAF 10 ADM Phasen, Zachman Framework, ArchiMate 3.2.
Strukturiere nach:
1. **Architecture Vision** – Business Drivers, Stakeholder Concerns
2. **Principles** – Name, Statement, Rationale, Implications (nach TOGAF)
3. **Capability Model** – Business Capabilities, Maturity Level, Target State
4. **Technology Radar** – Adopt/Trial/Assess/Hold Kategorien
5. **Governance** – Architecture Board, Waiver Process, Compliance Checks
6. **Roadmap** – Current State → Transition → Target State

Referenziere TOGAF ADM, Gartner EA Frameworks, Business Capability Modeling.
Bei verknüpften Initiativen: Mappe auf Business Capabilities und Technology Building Blocks.`,

  solution_arch: `Bei Solution Architecture: Nutze C4 Model, Arc42, IEEE 42010.
Strukturiere nach:
1. **Context & Scope** – System Context Diagram, Stakeholder
2. **Quality Goals** – ISO 25010 Qualitätsmerkmale (Performance, Security, Reliability)
3. **Architecture Constraints** – Technical, Organizational, Regulatory
4. **Building Block View** – Komponenten, Interfaces, Dependencies
5. **Runtime View** – Sequenz-/Aktivitätsdiagramme für kritische Szenarien
6. **Deployment View** – Infrastructure, Scaling, Environments
7. **Cross-Cutting Concerns** – Logging, Monitoring, Error Handling, i18n
8. **Architecture Decisions** – ADR Format (Context, Decision, Consequences)
9. **Risks & Technical Debt** – Bekannte Risiken, Mitigation, Debt Backlog

Referenziere Arc42, C4 Model (Simon Brown), 12-Factor App, Cloud Design Patterns.
Bei verknüpften Initiativen: Leite NFRs und Quality Attribute Scenarios ab.`,

  security: `Bei Security: Nutze NIST Cybersecurity Framework 2.0, OWASP, CIS Controls v8, BSI Grundschutz.
Strukturiere nach:
1. **Identify** – Asset Management, Risk Assessment, Governance
2. **Protect** – Access Control, Data Security, Secure Configuration, Training
3. **Detect** – Monitoring, Anomaly Detection, Continuous Monitoring
4. **Respond** – Incident Response Plan, Communication, Mitigation
5. **Recover** – Recovery Planning, Improvements, Communication
6. **Threat Model** – STRIDE/DREAD für identifizierte Threats
7. **Security Controls** – Preventive, Detective, Corrective mit Mapping auf CIS Controls

Referenziere NIST CSF 2.0, OWASP Top 10 (2021), OWASP ASVS, CIS Controls v8, MITRE ATT&CK.
Bei verknüpften Initiativen: Erstelle Threat Model und Security Requirements daraus.`,

  devops: `Bei DevOps: Nutze DORA Metrics, SRE Principles (Google), DevSecOps, CALMS Framework.
Strukturiere nach:
1. **CI/CD Pipeline Standards** – Build, Test, Security Scan, Deploy Stages
2. **Infrastructure as Code** – Terraform/Pulumi Standards, Module Structure, State Management
3. **Observability** – Logging (ELK/Loki), Metrics (Prometheus), Tracing (Jaeger/Tempo)
4. **SLI/SLO/SLA** – Service Level Indicators, Error Budgets, Alerting Thresholds
5. **Deployment Strategy** – Blue-Green, Canary, Rolling, Feature Flags
6. **Incident Management** – Severity Levels, On-Call Rotation, Postmortem Template
7. **Security in Pipeline** – SAST, DAST, SCA, Container Scanning, SBOM
8. **Environment Management** – Dev/Staging/Prod Parity, Secret Management, Config Management

Referenziere DORA (Accelerate), Google SRE Book, The Phoenix Project, DevSecOps Manifesto.
Bei verknüpften Initiativen: Leite SLOs und Deployment Requirements daraus ab.`,

  risk_management: `Bei Risiko-Management: Nutze ISO 31000, COSO ERM, FAIR Model.
Strukturiere nach: Risikoidentifikation, Risikobewertung (Impact × Likelihood), Risikobehandlung, Monitoring.`,

  general: `Erstelle eine allgemeine Best-Practice Guideline.
Strukturiere klar mit Zweck, Geltungsbereich, Anforderungen und Verantwortlichkeiten.`,
};

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function ComplianceFrameworkTabs({ value, onChange }: Props) {
  return (
    <Tabs value={value} onValueChange={onChange}>
      <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1 overflow-x-auto">
        {COMPLIANCE_FRAMEWORKS.map((fw) => (
          <TabsTrigger
            key={fw.id}
            value={fw.id}
            className="gap-1 sm:gap-1.5 text-[10px] sm:text-xs whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <fw.icon className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
            <span className="hidden sm:inline">{fw.label}</span>
            <span className="sm:hidden">{fw.label.length > 8 ? fw.label.slice(0, 6) + '…' : fw.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
