import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CheckCircle2, PlayCircle } from "lucide-react";
import type { Tutorial } from "@/data/tutorials";

interface TutorialReadingViewProps {
  tutorial: Tutorial;
  isCompleted: boolean;
  onBack: () => void;
  onStartOverlay: (tutorial: Tutorial) => void;
  onMarkComplete: (tutorialId: string) => void;
}

export function TutorialReadingView({ tutorial, isCompleted, onBack, onStartOverlay, onMarkComplete }: TutorialReadingViewProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Back & Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Zurück
        </Button>
      </div>

      <div className="flex items-start gap-3 sm:gap-4">
        <span className="text-3xl sm:text-4xl">{tutorial.icon}</span>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">{tutorial.title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{tutorial.description}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant="outline">~{tutorial.estimatedMinutes} Min.</Badge>
            <Badge variant="outline">{tutorial.steps.length} Schritte</Badge>
            {isCompleted && (
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3" /> Abgeschlossen
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="sm" className="gap-1.5" onClick={() => onStartOverlay(tutorial)}>
          <PlayCircle className="h-4 w-4" /> Interaktives Tutorial starten
        </Button>
      </div>

      <Separator />

      {/* Steps */}
      <div className="space-y-3 sm:space-y-4">
        {tutorial.steps.map((step, index) => (
          <Card key={step.id}>
            <CardHeader className="pb-2 p-4 sm:p-6 sm:pb-2">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {index + 1}
                </span>
                {step.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              {step.action && (
                <div className="bg-primary/5 border border-primary/20 rounded-md px-3 py-2 mt-3">
                  <p className="text-xs font-medium text-primary">💡 {step.action}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Mark complete */}
      {!isCompleted && (
        <div className="flex justify-center pt-4">
          <Button onClick={() => onMarkComplete(tutorial.id)} className="gap-2">
            <CheckCircle2 className="h-4 w-4" /> Als abgeschlossen markieren
          </Button>
        </div>
      )}
    </div>
  );
}
