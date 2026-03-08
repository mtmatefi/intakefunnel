import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useInitiativeLinks } from '@/hooks/useInitiativeLinks';
import { Compass, ExternalLink, RefreshCw } from 'lucide-react';

interface InitiativeLinkCardProps {
  intakeId: string;
}

export function InitiativeLinkCard({ intakeId }: InitiativeLinkCardProps) {
  const { data: links = [], isLoading } = useInitiativeLinks(intakeId);

  if (isLoading || links.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Compass className="h-4 w-4 text-primary" />
          Verknüpfte Strategie-Initiativen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {links.map((link) => (
          <div key={link.id} className="p-3 bg-background rounded-md border space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{link.initiative_title}</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {link.source_app.replace(/_/g, ' ')}
                </Badge>
                <Badge
                  variant={link.sync_status === 'intake_created' ? 'secondary' : 'outline'}
                  className="text-xs capitalize"
                >
                  {link.sync_status.replace(/_/g, ' ')}
                </Badge>
              </div>
            </div>

            {link.initiative_data && (
              <>
                {link.initiative_data.strategic_goal && (
                  <p className="text-xs text-muted-foreground">
                    <strong>Strategisches Ziel:</strong> {link.initiative_data.strategic_goal}
                  </p>
                )}
                {link.initiative_data.okr && (
                  <p className="text-xs text-muted-foreground">
                    <strong>OKR:</strong> {link.initiative_data.okr}
                  </p>
                )}
                {link.initiative_data.expected_outcome && (
                  <p className="text-xs text-muted-foreground">
                    <strong>Erwartetes Outcome:</strong> {link.initiative_data.expected_outcome}
                  </p>
                )}
              </>
            )}

            <Separator />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Tenant: {link.tenant_id}</span>
              <span className="flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                {new Date(link.last_synced_at).toLocaleString('de-DE')}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
