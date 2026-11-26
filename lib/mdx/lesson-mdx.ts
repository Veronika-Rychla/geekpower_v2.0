import "server-only";

import { serialize } from "next-mdx-remote/serialize";
import remarkFlexibleMarkers from "remark-flexible-markers";
import remarkGfm from "remark-gfm";

import { remarkCallouts } from "@/lib/mdx/remark-callouts";
import { remarkLessonComponents } from "@/lib/mdx/remark-lesson-components";
import { remarkYoutube } from "@/components/blog/markdown/remark-youtube";
import type { QuizDefinition } from "@/lib/quizzes";

/*
 * The one MDX setup for lesson sections: the lesson page, the editor preview
 * and the save-time validation all compile through here, so what the editor
 * accepts is exactly what the page can render. JavaScript in the content is
 * blocked (`blockJS`), and remarkLessonComponents turns anything that would be
 * dropped or crash into an error instead.
 */

type MdxOptions = NonNullable<NonNullable<Parameters<typeof serialize>[1]>["mdxOptions"]>;

export function lessonMdxOptions(onQuizzes?: (quizzes: QuizDefinition[]) => void): MdxOptions {
  return {
    remarkPlugins: [
      remarkGfm,
      remarkFlexibleMarkers,
      remarkCallouts,
      remarkYoutube,
      [remarkLessonComponents, { onQuizzes }],
    ],
  };
}

/** Holds the quizzes `remarkLessonComponents` finds; read `quizzes` after compiling. */
export function createQuizCollector() {
  let found: QuizDefinition[] = [];
  return {
    onQuizzes: (quizzes: QuizDefinition[]) => {
      found = quizzes;
    },
    get quizzes() {
      return found;
    },
  };
}

/** The compiler's message with a code frame, minus next-mdx-remote's boilerplate lines. */
function describeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/^\[next-mdx-remote\] error compiling MDX:\n/, "")
    .replace(/\n*More information: https:\/\/mdxjs\.com\/docs\/troubleshooting-mdx\s*$/, "")
    .trim();
}

type CompileResult = { compiledSource: string; quizzes: QuizDefinition[] } | { error: string };

/** Compiles for the browser (`MDXRemote` from "next-mdx-remote"), or returns a readable error. */
export async function compileLessonSource(source: string): Promise<CompileResult> {
  const collector = createQuizCollector();
  try {
    const { compiledSource } = await serialize(source, {
      mdxOptions: lessonMdxOptions(collector.onQuizzes),
      blockJS: true,
    });
    return { compiledSource, quizzes: collector.quizzes };
  } catch (error) {
    return { error: describeError(error) };
  }
}

/** The quizzes in a saved section. Saved content was validated, so a failure here is a bug. */
export async function getLessonQuizzes(source: string): Promise<QuizDefinition[]> {
  const result = await compileLessonSource(source);
  if ("error" in result) {
    throw new Error(`Saved lesson content doesn't compile: ${result.error}`);
  }
  return result.quizzes;
}
