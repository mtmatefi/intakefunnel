import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, RotateCcw } from "lucide-react";
import { getTutorialsForRole, type Tutorial } from "@/data/tutorials";
import { TutorialCard } from "@/components/tutorial/TutorialCard";
import { TutorialReadingView } from "@/components/tutorial/TutorialReadingView";
import { useTutorial } from "@/hooks/useTutorial";

const categoryLabels: Record<string, string> = {
  "getting-started": "Erste Schritte",
  features: "Features",
  advanced: "Fortgeschritten",
  admin: "Administration",
};

export default function TutorialsPage() {
  const { user } = useAuth();
  const {
    isTutorialCompleted,
    completeTutorial,
    resetProgress,
    startOverlayTutorial,
  } = useTutorial();

  const [readingTutorial, setReadingTutorial] = useState<Tutorial | null>(null);

  if (!user) return null;

  const roleTutorials = getTutorialsForRole(user.role);
  const completedCount = roleTutorials.filter((t) => isTutorialCompleted(t.id)).length;
  const progressPct = roleTutorials.length > 0 ? (completedCount / roleTutorials.length) * 100 : 0;
  const categories = [...new Set(roleTutorials.map((t) => t.category))];

  if (readingTutorial) {
    return (
      <AppLayout>
        <div className="p-4 sm:p-6 max-w-3xl mx-auto">
          <TutorialReadingView
            tutorial={readingTutorial}
            isCompleted={isTutorialCompleted(readingTutorial.id)}
            onBack={() => setReadingTutorial(null)}
            onStartOverlay={(t) => {
              setReadingTutorial(null);
              startOverlayTutorial(t);
            }}
            onMarkComplete={completeTutorial}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Tutorials & Onboarding</h1>
              <p className="text-sm text-muted-foreground">
                Schritt-für-Schritt Anleitungen für Ihre Rolle als{" "}
                <span className="text-xs ml-1 px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">{user.role}</span>
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 self-start" onClick={resetProgress}>
            <RotateCcw className="h-3.5 w-3.5" /> Fortschritt zurücksetzen
          </Button>
        </div>

        {/* Progress */}
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Gesamtfortschritt</span>
              <span className="text-sm text-muted-foreground">
                {completedCount} / {roleTutorials.length} abgeschlossen
              </span>
            </div>
            <Progress value={progressPct} className="h-2" />
          </CardContent>
        </Card>

        {/* Tutorials by category */}
        <Tabs defaultValue={categories[0] || "getting-started"}>
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Math.min(categories.length, 4)}, minmax(0, 1fr))` }}>
            {categories.map((cat) => (
              <TabsTrigger key={cat} value={cat} className="text-xs sm:text-sm">
                {categoryLabels[cat] || cat}
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map((cat) => (
            <TabsContent key={cat} value={cat} className="space-y-3 mt-4">
              {roleTutorials
                .filter((t) => t.category === cat)
                .map((tutorial) => (
                  <TutorialCard
                    key={tutorial.id}
                    tutorial={tutorial}
                    isCompleted={isTutorialCompleted(tutorial.id)}
                    onStartOverlay={startOverlayTutorial}
                    onStartReading={setReadingTutorial}
                  />
                ))}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppLayout>
  );
}
