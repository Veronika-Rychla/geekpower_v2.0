"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuizOption {
  label: string;
  correct?: boolean;
}

interface QuizProps {
  question: string;
  options: QuizOption[];
}

export function Quiz({ question, options }: QuizProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const selectedOption = selected === null ? null : options[selected];

  return (
    <div className="not-prose my-6 rounded-lg border border-border bg-card p-4">
      <p className="mb-3 font-medium text-card-foreground">{question}</p>
      <div className="flex flex-col gap-2">
        {options.map((option, index) => {
          const isSelected = selected === index;
          return (
            <Button
              key={option.label}
              type="button"
              variant="outline"
              onClick={() => setSelected(index)}
              className={cn(
                "justify-start",
                isSelected && option.correct && "border-green-500 text-green-500",
                isSelected && !option.correct && "border-destructive text-destructive",
              )}
            >
              {option.label}
            </Button>
          );
        })}
      </div>
      {selectedOption && (
        <p className="mt-3 text-sm text-muted-foreground">
          {selectedOption.correct ? "Correct!" : "Not quite — try again."}
        </p>
      )}
    </div>
  );
}
