import { useState, useEffect, useCallback } from "react";
import type { Tutorial } from "@/data/tutorials";

const STORAGE_KEY = "tutorial_progress";

interface TutorialProgress {
  completedTutorials: string[];
  currentTutorialId: string | null;
  currentStepIndex: number;
  hasSeenOnboarding: boolean;
}

function getProgress(): TutorialProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    completedTutorials: [],
    currentTutorialId: null,
    currentStepIndex: 0,
    hasSeenOnboarding: false,
  };
}

function saveProgress(progress: TutorialProgress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function useTutorial() {
  const [progress, setProgress] = useState<TutorialProgress>(getProgress);
  const [overlayTutorial, setOverlayTutorial] = useState<Tutorial | null>(null);
  const [overlayStepIndex, setOverlayStepIndex] = useState(0);

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  const isTutorialCompleted = useCallback(
    (tutorialId: string) => progress.completedTutorials.includes(tutorialId),
    [progress.completedTutorials]
  );

  const completeTutorial = useCallback((tutorialId: string) => {
    setProgress((prev) => ({
      ...prev,
      completedTutorials: [...new Set([...prev.completedTutorials, tutorialId])],
    }));
  }, []);

  const markOnboardingSeen = useCallback(() => {
    setProgress((prev) => ({ ...prev, hasSeenOnboarding: true }));
  }, []);

  const resetProgress = useCallback(() => {
    const empty: TutorialProgress = {
      completedTutorials: [],
      currentTutorialId: null,
      currentStepIndex: 0,
      hasSeenOnboarding: false,
    };
    setProgress(empty);
    setOverlayTutorial(null);
    setOverlayStepIndex(0);
  }, []);

  // Overlay tutorial controls
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

  return {
    progress,
    isTutorialCompleted,
    completeTutorial,
    markOnboardingSeen,
    resetProgress,
    // Overlay
    overlayTutorial,
    overlayStepIndex,
    startOverlayTutorial,
    nextOverlayStep,
    prevOverlayStep,
    closeOverlay,
  };
}
