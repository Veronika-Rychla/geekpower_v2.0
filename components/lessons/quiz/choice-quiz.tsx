"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { RenderedChoiceOption } from "@/components/lessons/quiz/quiz-parts";
import { answerQuiz } from "@/lib/actions";
import { cn } from "@/lib/utils";
import { useDictionary } from "@/components/i18n-provider";

interface ChoiceQuizProps {
  sublessonGuid: string;
  quizId: string;
  question: ReactNode;
  options: RenderedChoiceOption[];
  /** The saved answer, if any. */
  initialSelectedId?: string;
  initialCorrect?: boolean;
}

/** A single-choice quiz on the lesson page. The server grades the answer; the correct one never reaches the browser. */
export function ChoiceQuiz({
  sublessonGuid,
  quizId,
  question,
  options,
  initialSelectedId,
  initialCorrect,
}: ChoiceQuizProps) {
  const t = useDictionary().quiz;
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? null);
  // null until graded
  const [correct, setCorrect] = useState<boolean | null>(initialSelectedId ? (initialCorrect ?? false) : null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submitted = correct !== null;

  function handleCheck() {
    if (!selectedId) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await answerQuiz(sublessonGuid, quizId, selectedId);
        setCorrect(result.correct);
      } catch {
        setError(t.saveFailed);
      }
    });
  }

  function handleRedo() {
    setSelectedId(null);
    setCorrect(null);
  }

  return (
    <Card className="not-prose my-8 gap-4 p-6">
      <div className="font-medium text-foreground">{question}</div>

      <div className="flex flex-col gap-2">
        {options.map((option) => {
          const isSelected = selectedId === option.id;
          const showCorrect = submitted && correct && isSelected;
          const showIncorrect = submitted && !correct && isSelected;

          return (
            <button
              key={option.id}
              type="button"
              disabled={submitted || isPending}
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
              <span>{option.content}</span>
            </button>
          );
        })}
      </div>

      {submitted ? (
        <div className="flex items-center gap-3">
          <p
            className={cn(
              "text-sm font-medium",
              correct ? "text-green-600 dark:text-green-400" : "text-destructive",
            )}
          >
            {correct ? t.correct : t.incorrect}
          </p>
          {!correct && (
            <Button type="button" variant="outline" size="sm" onClick={handleRedo}>
              {t.redo}
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-start gap-2">
          <Button type="button" disabled={!selectedId || isPending} onClick={handleCheck}>
            {isPending ? t.checking : t.check}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}
    </Card>
  );
}
