"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface QuizOption {
  id: string;
  text: string;
}

interface QuizProps {
  question: string;
  options: QuizOption[];
  correctId: string;
}

export function Quiz({ question, options, correctId }: QuizProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const isCorrect = selectedId === correctId;

  return (
    <Card className="not-prose my-8 gap-4 p-6">
      <p className="font-medium text-foreground">{question}</p>

      <div className="flex flex-col gap-2">
        {options.map((option) => {
          const isSelected = selectedId === option.id;
          const showCorrect = submitted && option.id === correctId;
          const showIncorrect = submitted && isSelected && !showCorrect;

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
                submitted && !isSelected && !showCorrect && "opacity-60",
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
        <p
          className={cn(
            "text-sm font-medium",
            isCorrect ? "text-green-600 dark:text-green-400" : "text-destructive",
          )}
        >
          {isCorrect ? "Correct! 🎉" : "Not quite — the correct answer is highlighted above."}
        </p>
      ) : (
        <Button type="button" disabled={!selectedId} onClick={() => setSubmitted(true)} className="self-start">
          Check answer
        </Button>
      )}
    </Card>
  );
}
