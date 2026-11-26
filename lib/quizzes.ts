/*
 * Quizzes inside lesson MDX. Shared by the server (parsing, grading) and the
 * editor (quiz builder), so it must stay free of server-only imports.
 *
 * A new quiz kind needs: a definition type in `QuizDefinition`, a tag in
 * `QUIZ_TAGS`, a branch in `gradeQuiz`, a parser in
 * `lib/mdx/remark-lesson-components.ts`, a renderer for the lesson page and
 * the editor preview, and a builder in `components/lessons/editor/quiz-builders.tsx`.
 */

export interface ChoiceOption {
  id: string;
  /** Raw Markdown, as written between the `<Option>` tags. */
  text: string;
}

/** Single-choice question: exactly one option is correct. */
export interface ChoiceQuizDefinition {
  kind: "choice";
  id: string;
  /** Raw Markdown, as written between the `<Question>` tags. */
  question: string;
  options: ChoiceOption[];
  correctId: string;
}

export type QuizDefinition = ChoiceQuizDefinition;
export type QuizKind = QuizDefinition["kind"];

/** The MDX component name of each quiz kind. */
export const QUIZ_TAGS: Record<QuizKind, string> = {
  choice: "Quiz",
};

/** Components allowed only inside a quiz. */
export const QUIZ_PART_TAGS = ["Question", "Option"] as const;

export const QUIZ_ID_PATTERN = /^[\w-]{1,64}$/;
export const CHOICE_MIN_OPTIONS = 2;
export const CHOICE_MAX_OPTIONS = 8;

/** What `progress.interactions.response` holds for a choice quiz. */
export interface ChoiceQuizResponse {
  selectedId: string;
  correct: boolean;
}

/**
 * Checks a student's answer on the server. Returns null for an answer that
 * doesn't fit the quiz (e.g. an option id that doesn't exist).
 */
export function gradeQuiz(
  quiz: QuizDefinition,
  answer: unknown,
): { correct: boolean; response: ChoiceQuizResponse } | null {
  switch (quiz.kind) {
    case "choice": {
      if (typeof answer !== "string" || !quiz.options.some((option) => option.id === answer)) {
        return null;
      }
      const correct = answer === quiz.correctId;
      return { correct, response: { selectedId: answer, correct } };
    }
  }
}

/** Every quiz kind stores `correct` in its saved response. */
export function isResponseCorrect(response: unknown): boolean {
  return (response as { correct?: unknown } | null | undefined)?.correct === true;
}

// --- MDX syntax (used by the editor's quiz builder) ---

/**
 * Text placed between JSX tags is MDX: `{`, `}` and `<` would start an
 * expression or a tag, so they're escaped. Newlines would end the element.
 */
export function escapeMdxText(text: string): string {
  return text.replace(/\s*\n\s*/g, " ").trim().replace(/[{}<]/g, "\\$&");
}

export function unescapeMdxText(text: string): string {
  return text.trim().replace(/\\([{}<])/g, "$1");
}

/** Option ids are letters in order: a, b, c… */
export function optionId(index: number): string {
  return String.fromCharCode("a".charCodeAt(0) + index);
}

export function choiceQuizToMdx(quiz: ChoiceQuizDefinition): string {
  const lines = [
    `<Quiz id="${quiz.id}" correct="${quiz.correctId}">`,
    `  <Question>${escapeMdxText(quiz.question)}</Question>`,
    ...quiz.options.map((option) => `  <Option id="${option.id}">${escapeMdxText(option.text)}</Option>`),
    `</Quiz>`,
  ];
  return lines.join("\n");
}

/** Reads back a quiz block the builder wrote (or one edited by hand in the same shape). */
export function choiceQuizFromMdx(block: string): ChoiceQuizDefinition | null {
  const open = block.match(/^<Quiz\b([^>]*)>/);
  if (!open) return null;
  const id = open[1].match(/\bid="([^"]*)"/)?.[1];
  const correctId = open[1].match(/\bcorrect="([^"]*)"/)?.[1] ?? "";
  if (!id) return null;

  const question = block.match(/<Question>([\s\S]*?)<\/Question>/)?.[1] ?? "";
  const options = [...block.matchAll(/<Option\s+id="([^"]*)"\s*>([\s\S]*?)<\/Option>/g)].map((match) => ({
    id: match[1],
    text: unescapeMdxText(match[2]),
  }));

  return { kind: "choice", id, question: unescapeMdxText(question), options, correctId };
}

const QUIZ_BLOCK = /<(\w+)\b[^>]*>[\s\S]*?<\/\1>/g;

/** The quiz block (`<Quiz …>…</Quiz>`) containing `position`, if any. */
export function findQuizBlockAt(
  source: string,
  position: number,
): { kind: QuizKind; start: number; end: number; text: string } | null {
  const kinds = Object.entries(QUIZ_TAGS) as [QuizKind, string][];
  for (const match of source.matchAll(QUIZ_BLOCK)) {
    const kind = kinds.find(([, tag]) => tag === match[1])?.[0];
    const start = match.index;
    const end = start + match[0].length;
    if (kind && start <= position && position <= end) {
      return { kind, start, end, text: match[0] };
    }
  }
  return null;
}

/** A quiz id that isn't used yet in `source`. */
export function newQuizId(source: string): string {
  const used = new Set([...source.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
  let id: string;
  do {
    id = `quiz-${Math.random().toString(36).slice(2, 8)}`;
  } while (used.has(id));
  return id;
}
