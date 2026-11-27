"use client";

import type { ComponentType } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CHOICE_MAX_OPTIONS,
  CHOICE_MIN_OPTIONS,
  choiceQuizFromMdx,
  choiceQuizToMdx,
  optionId,
  type QuizKind,
} from "@/lib/quizzes";
import { useDictionary } from "@/components/i18n-provider";
import type { Dictionary } from "@/lib/dictionary";
import { fill } from "@/lib/i18n";

/*
 * The quiz builder's form for each quiz kind. To add a kind, add its draft
 * shape to `QuizDraft`, an entry to `QUIZ_BUILDERS`, and its name and messages
 * to messages/*.json `quizBuilder` (see lib/quizzes.ts for the rest of the list).
 */

export interface ChoiceQuizDraft {
  kind: "choice";
  question: string;
  options: string[];
  /** Index into `options`, or -1 when none is picked yet. */
  correctIndex: number;
}

export type QuizDraft = ChoiceQuizDraft;

export interface QuizFormProps<D extends QuizDraft = QuizDraft> {
  idPrefix: string;
  draft: D;
  onChange: (draft: D) => void;
}

export interface QuizBuilder<D extends QuizDraft = QuizDraft> {
  empty: () => D;
  /** Reads an existing quiz block back into a draft, or null if it can't. */
  fromMdx: (block: string) => D | null;
  toMdx: (draft: D, id: string) => string;
  /** A message (in `t`'s language) for the first problem, or null when the draft can be inserted. */
  validate: (draft: D, t: Dictionary["quizBuilder"]) => string | null;
  Form: ComponentType<QuizFormProps<D>>;
}

const choiceBuilder: QuizBuilder<ChoiceQuizDraft> = {
  empty: () => ({ kind: "choice", question: "", options: ["", "", ""], correctIndex: -1 }),
  fromMdx: (block) => {
    const quiz = choiceQuizFromMdx(block);
    if (!quiz) return null;
    return {
      kind: "choice",
      question: quiz.question,
      options: quiz.options.map((option) => option.text),
      correctIndex: quiz.options.findIndex((option) => option.id === quiz.correctId),
    };
  },
  toMdx: (draft, id) => {
    const options = draft.options.map((text, index) => ({ id: optionId(index), text }));
    return choiceQuizToMdx({
      kind: "choice",
      id,
      question: draft.question,
      options,
      correctId: optionId(draft.correctIndex),
    });
  },
  validate: (draft, { choice: t }) => {
    if (!draft.question.trim()) return t.needQuestion;
    if (draft.options.length < CHOICE_MIN_OPTIONS) return fill(t.needOptions, { min: CHOICE_MIN_OPTIONS });
    if (draft.options.some((option) => !option.trim())) return t.emptyOption;
    if (draft.correctIndex < 0 || draft.correctIndex >= draft.options.length) return t.needCorrect;
    return null;
  },
  Form: ChoiceQuizForm,
};

export const QUIZ_BUILDERS: Record<QuizKind, QuizBuilder> = {
  choice: choiceBuilder,
};

function ChoiceQuizForm({ idPrefix, draft, onChange }: QuizFormProps<ChoiceQuizDraft>) {
  const builderText = useDictionary().quizBuilder;
  const t = builderText.choice;

  function setOption(index: number, text: string) {
    onChange({ ...draft, options: draft.options.map((option, i) => (i === index ? text : option)) });
  }

  function removeOption(index: number) {
    const correctIndex =
      draft.correctIndex === index ? -1 : draft.correctIndex > index ? draft.correctIndex - 1 : draft.correctIndex;
    onChange({ ...draft, options: draft.options.filter((_, i) => i !== index), correctIndex });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-question`}>{t.question}</Label>
        <Textarea
          id={`${idPrefix}-question`}
          rows={2}
          className="min-h-0"
          value={draft.question}
          onChange={(event) => onChange({ ...draft, question: event.target.value })}
          autoFocus
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">{t.options}</legend>
        {draft.options.map((option, index) => {
          const id = optionId(index).toUpperCase();
          return (
          <div key={index} className="flex items-center gap-2">
            <input
              type="radio"
              name={`${idPrefix}-correct`}
              className="size-4 shrink-0 accent-primary"
              aria-label={fill(t.optionCorrect, { id })}
              checked={draft.correctIndex === index}
              onChange={() => onChange({ ...draft, correctIndex: index })}
            />
            <Input
              aria-label={fill(t.option, { id })}
              placeholder={fill(t.option, { id })}
              value={option}
              onChange={(event) => setOption(index, event.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={fill(t.removeOption, { id })}
              disabled={draft.options.length <= CHOICE_MIN_OPTIONS}
              onClick={() => removeOption(index)}
            >
              <X className="size-3.5" />
            </Button>
          </div>
          );
        })}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 self-start"
          disabled={draft.options.length >= CHOICE_MAX_OPTIONS}
          onClick={() => onChange({ ...draft, options: [...draft.options, ""] })}
        >
          <Plus className="size-3.5" />
          {t.addOption}
        </Button>
      </fieldset>

      <p className="text-xs text-muted-foreground">
        {builderText.markdownHint}
      </p>
    </div>
  );
}
