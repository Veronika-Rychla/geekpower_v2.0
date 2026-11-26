import type { ReactNode } from "react";
import { Check } from "lucide-react";

import { Card } from "@/components/ui/card";
import { readChoiceQuizParts } from "@/components/lessons/quiz/quiz-parts";
import { cn } from "@/lib/utils";

interface ChoiceQuizPreviewProps {
  id?: string;
  correct?: string;
  children?: ReactNode;
}

/** How a choice quiz looks in the editor preview: not interactive, with the correct option marked. */
export function ChoiceQuizPreview({ id, correct, children }: ChoiceQuizPreviewProps) {
  const { question, options } = readChoiceQuizParts(children);

  return (
    <Card className="not-prose my-8 gap-4 p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="font-medium text-foreground">{question}</div>
        <span className="shrink-0 font-mono text-xs text-muted-foreground">{id}</span>
      </div>
      <div className="flex flex-col gap-2">
        {options.map((option) => {
          const isCorrect = option.id === correct;
          return (
            <div
              key={option.id}
              className={cn(
                "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
                isCorrect ? "border-green-500 bg-green-500/10 text-green-600 dark:text-green-400" : "border-input",
              )}
            >
              {isCorrect && <Check className="size-4 shrink-0" />}
              <span>{option.content}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
