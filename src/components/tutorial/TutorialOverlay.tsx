import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { X, ChevronLeft, ChevronRight, Lightbulb } from "lucide-react";
import type { Tutorial } from "@/data/tutorials";

interface TutorialOverlayProps {
  tutorial: Tutorial;
  stepIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

export function TutorialOverlay({ tutorial, stepIndex, onNext, onPrev, onClose }: TutorialOverlayProps) {
  const step = tutorial.steps[stepIndex];
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === tutorial.steps.length - 1;
  const progressPct = ((stepIndex + 1) / tutorial.steps.length) * 100;

  useEffect(() => {
    if (!step.targetSelector) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(step.targetSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      setTargetRect(null);
    }
  }, [step.targetSelector, stepIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" || e.key === "Enter") onNext();
      if (e.key === "ArrowLeft" && !isFirst) onPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, onNext, onPrev, isFirst]);

  // Calculate card position
  const getCardStyle = (): React.CSSProperties => {
    if (!targetRect) {
      return {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 10002,
      };
    }

    const padding = 16;
    const placement = step.placement || "bottom";
    const style: React.CSSProperties = {
      position: "fixed",
      zIndex: 10002,
      maxWidth: "min(400px, calc(100vw - 32px))",
    };

    switch (placement) {
      case "bottom":
        style.top = targetRect.bottom + padding;
        style.left = Math.max(16, Math.min(targetRect.left, window.innerWidth - 416));
        break;
      case "top":
        style.bottom = window.innerHeight - targetRect.top + padding;
        style.left = Math.max(16, Math.min(targetRect.left, window.innerWidth - 416));
        break;
      case "right":
        style.top = targetRect.top;
        style.left = Math.min(targetRect.right + padding, window.innerWidth - 416);
        break;
      case "left":
        style.top = targetRect.top;
        style.right = window.innerWidth - targetRect.left + padding;
        break;
    }

    return style;
  };

  return (
    <div className="fixed inset-0 z-[10000]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      {/* Spotlight cutout */}
      {targetRect && (
        <div
          className="absolute border-2 border-primary rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] pointer-events-none"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            zIndex: 10001,
          }}
        />
      )}

      {/* Tutorial Card */}
      <Card ref={cardRef} style={getCardStyle()} className="shadow-xl border-primary/20 w-[380px] max-w-[calc(100vw-32px)]">
        <CardContent className="p-4 sm:p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary shrink-0" />
              <Badge variant="outline" className="text-xs">
                {stepIndex + 1} / {tutorial.steps.length}
              </Badge>
            </div>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress */}
          <Progress value={progressPct} className="h-1 mb-3" />

          {/* Content */}
          <h3 className="font-semibold text-base mb-2">{step.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">{step.description}</p>

          {step.action && (
            <div className="bg-primary/5 border border-primary/20 rounded-md px-3 py-2 mb-4">
              <p className="text-xs font-medium text-primary">💡 {step.action}</p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onPrev}
              disabled={isFirst}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Zurück</span>
            </Button>

            <span className="text-xs text-muted-foreground">
              ESC zum Schließen
            </span>

            <Button size="sm" onClick={onNext} className="gap-1">
              <span>{isLast ? "Fertig ✓" : "Weiter"}</span>
              {!isLast && <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
