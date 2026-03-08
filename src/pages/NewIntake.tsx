import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { IntakeWizard } from '@/components/intake/IntakeWizard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function NewIntakePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromInnovation = (location.state as any)?.fromInnovation ?? null;

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {fromInnovation ? `Intake: ${fromInnovation.title}` : 'New Intake Request'}
            </h1>
            <p className="text-muted-foreground">
              {fromInnovation 
                ? 'Daten aus der Innovation werden übernommen – nur fehlende Fragen verbleiben'
                : "Let's understand your software need"}
            </p>
          </div>
        </div>

        <IntakeWizard innovationContext={fromInnovation} />
      </div>
    </AppLayout>
  );
}
