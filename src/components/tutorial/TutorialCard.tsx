import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, PlayCircle, BookOpen } from "lucide-react";
import type { Tutorial } from "@/data/tutorials";

interface TutorialCardProps {
  tutorial: Tutorial;
  isCompleted: boolean;
  onStartOverlay: (tutorial: Tutorial) => void;
  onStartReading: (tutorial: Tutorial) => void;
}

export function TutorialCard({ tutorial, isCompleted, onStartOverlay, onStartReading }: TutorialCardProps) {
  return (
    <Card className={`transition-all hover:shadow-md ${isCompleted ? "opacity-75" : ""}`}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0">{tutorial.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold text-sm sm:text-base">{tutorial.title}</h3>
              {isCompleted && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <CheckCircle2 className="h-3 w-3" /> Abgeschlossen
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mb-3 line-clamp-2">{tutorial.description}</p>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> ~{tutorial.estimatedMinutes} Min.
              </span>
              <Badge variant="outline" className="text-xs">
                {tutorial.steps.length} Schritte
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Button
                size="sm"
                variant={isCompleted ? "outline" : "default"}
                className="gap-1.5 text-xs sm:text-sm"
                onClick={() => onStartOverlay(tutorial)}
              >
                <PlayCircle className="h-3.5 w-3.5" />
                Interaktiv starten
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5 text-xs sm:text-sm"
                onClick={() => onStartReading(tutorial)}
              >
                <BookOpen className="h-3.5 w-3.5" />
                Lesen
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
