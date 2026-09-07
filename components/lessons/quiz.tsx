"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { saveInteraction } from "@/lib/actions";

interface QuizOption {
  id: string;
  text: string;
}

export interface QuizProps {
  id: string;
  question: string;
  options: QuizOption[];
  correctId: string;
}

interface QuizWithProgressProps extends QuizProps {
  lessonSlug: string;
  sublessonSlug: string;
  initialSelectedId?: string;
}

export function Quiz({
  id,
  question,
  options,
  correctId,
  lessonSlug,
  sublessonSlug,
  initialSelectedId,
}: QuizWithProgressProps) {
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? null);
  const [submitted, setSubmitted] = useState(Boolean(initialSelectedId));
  const [isPending, startTransition] = useTransition();

  const isCorrect = selectedId === correctId;

  function handleCheck() {
    if (!selectedId) return;
    setSubmitted(true);
    startTransition(async () => {
      await saveInteraction(lessonSlug, sublessonSlug, id, "quiz", {
        selectedId,
        correct: selectedId === correctId,
      });
    });
  }

  function handleRedo() {
    setSelectedId(null);
    setSubmitted(false);
  }

  return (
    <Card className="not-prose my-8 gap-4 p-6">
      <p className="font-medium text-foreground">{question}</p>

      <div className="flex flex-col gap-2">
        {options.map((option) => {
          const isSelected = selectedId === option.id;
          const showCorrect = submitted && isCorrect && isSelected;
          const showIncorrect = submitted && !isCorrect && isSelected;

          return (
            <button
              key={option.id}
              type="button"
              disabled={submitted}
              onClick={() => setSelectedId(option.id)}
              className={cn(
                "flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors disabled:pointer-events-none",
                !submitted && isSelected && "border-primary bg-primary/10",
                !submitted && !isSelected && "border-input hover:bg-muted",
                showCorrect && "border-green-500 bg-green-500/10 text-green-600 dark:text-green-400",
                showIncorrect && "border-destructive bg-destructive/10 text-destructive",
                submitted && !isSelected && "opacity-60",
              )}
            >
              {showCorrect && <Check className="size-4 shrink-0" />}
              {showIncorrect && <X className="size-4 shrink-0" />}
              <span>{option.text}</span>
            </button>
          );
        })}
      </div>

      {submitted ? (
        <div className="flex items-center gap-3">
          <p
            className={cn(
              "text-sm font-medium",
              isCorrect ? "text-green-600 dark:text-green-400" : "text-destructive",
            )}
          >
            {isCorrect ? "Correct! 🎉" : "Not quite — try again."}
          </p>
          {!isCorrect && (
            <Button type="button" variant="outline" size="sm" onClick={handleRedo}>
              Redo
            </Button>
          )}
        </div>
      ) : (
        <Button type="button" disabled={!selectedId || isPending} onClick={handleCheck} className="self-start">
          {isPending ? "Saving…" : "Check answer"}
        </Button>
      )}
    </Card>
  );
}
