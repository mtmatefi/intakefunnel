import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { Tutorial } from "@/data/tutorials";

const STORAGE_KEY = "tutorial_progress";

interface TutorialProgress {
  completedTutorials: string[];
  hasSeenOnboarding: boolean;
}

interface TutorialContextType {
  progress: TutorialProgress;
  isTutorialCompleted: (id: string) => boolean;
  completeTutorial: (id: string) => void;
  markOnboardingSeen: () => void;
  resetProgress: () => void;
  overlayTutorial: Tutorial | null;
  overlayStepIndex: number;
  startOverlayTutorial: (tutorial: Tutorial) => void;
  nextOverlayStep: () => void;
  prevOverlayStep: () => void;
  closeOverlay: () => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

function getProgress(): TutorialProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { completedTutorials: [], hasSeenOnboarding: false };
}

function saveProgress(progress: TutorialProgress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<TutorialProgress>(getProgress);
  const [overlayTutorial, setOverlayTutorial] = useState<Tutorial | null>(null);
  const [overlayStepIndex, setOverlayStepIndex] = useState(0);

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  const isTutorialCompleted = useCallback(
    (id: string) => progress.completedTutorials.includes(id),
    [progress.completedTutorials]
  );

  const completeTutorial = useCallback((id: string) => {
    setProgress((prev) => ({
      ...prev,
      completedTutorials: [...new Set([...prev.completedTutorials, id])],
    }));
  }, []);

  const markOnboardingSeen = useCallback(() => {
    setProgress((prev) => ({ ...prev, hasSeenOnboarding: true }));
  }, []);

  const resetProgress = useCallback(() => {
    setProgress({ completedTutorials: [], hasSeenOnboarding: false });
    setOverlayTutorial(null);
    setOverlayStepIndex(0);
  }, []);

  const startOverlayTutorial = useCallback((tutorial: Tutorial) => {
    setOverlayTutorial(tutorial);
    setOverlayStepIndex(0);
  }, []);

  const nextOverlayStep = useCallback(() => {
    if (!overlayTutorial) return;
    if (overlayStepIndex < overlayTutorial.steps.length - 1) {
      setOverlayStepIndex((i) => i + 1);
    } else {
      completeTutorial(overlayTutorial.id);
      setOverlayTutorial(null);
      setOverlayStepIndex(0);
    }
  }, [overlayTutorial, overlayStepIndex, completeTutorial]);

  const prevOverlayStep = useCallback(() => {
    setOverlayStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const closeOverlay = useCallback(() => {
    setOverlayTutorial(null);
    setOverlayStepIndex(0);
  }, []);

  return (
    <TutorialContext.Provider
      value={{
        progress,
        isTutorialCompleted,
        completeTutorial,
        markOnboardingSeen,
        resetProgress,
        overlayTutorial,
        overlayStepIndex,
        startOverlayTutorial,
        nextOverlayStep,
        prevOverlayStep,
        closeOverlay,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error("useTutorial must be used within TutorialProvider");
  return ctx;
}
