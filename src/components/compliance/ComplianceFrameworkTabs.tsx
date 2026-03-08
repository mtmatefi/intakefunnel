import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Globe, Lock, FileText, Scale, AlertTriangle } from 'lucide-react';

export const COMPLIANCE_FRAMEWORKS = [
  { id: 'all', label: 'Alle', icon: FileText },
  { id: 'itar', label: 'ITAR', icon: Shield },
  { id: 'ear_export', label: 'Export Control', icon: Globe },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'gdpr', label: 'DSGVO/GDPR', icon: Scale },
  { id: 'iso27001', label: 'ISO 27001', icon: Shield },
  { id: 'risk_management', label: 'Risiko', icon: AlertTriangle },
  { id: 'general', label: 'Allgemein', icon: FileText },
] as const;

export type ComplianceFramework = typeof COMPLIANCE_FRAMEWORKS[number]['id'];

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function ComplianceFrameworkTabs({ value, onChange }: Props) {
  return (
    <Tabs value={value} onValueChange={onChange}>
      <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
        {COMPLIANCE_FRAMEWORKS.map((fw) => (
          <TabsTrigger
            key={fw.id}
            value={fw.id}
            className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <fw.icon className="h-3.5 w-3.5" />
            {fw.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
