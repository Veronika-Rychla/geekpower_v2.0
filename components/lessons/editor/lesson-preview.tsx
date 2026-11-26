"use client";

import { useEffect, useState } from "react";
import { MDXRemote } from "next-mdx-remote";
import { TriangleAlert } from "lucide-react";

import { ChoiceQuizPreview } from "@/components/lessons/quiz/quiz-preview";
import { QUIZ_PART_COMPONENTS } from "@/components/lessons/quiz/quiz-parts";
import { previewSublesson } from "@/lib/actions";

const PREVIEW_DELAY_MS = 400;

const components = {
  table: (props: React.ComponentProps<"table">) => (
    <div className="overflow-x-auto">
      <table {...props} />
    </div>
  ),
  Quiz: ChoiceQuizPreview,
  ...QUIZ_PART_COMPONENTS,
};

/**
 * Live preview of a section. The server compiles it with the same MDX setup
 * as the lesson page (so errors here are the errors that would block saving),
 * and the browser renders the result. The last good render stays on screen
 * under the error while the text is broken.
 */
export function LessonPreview({ source }: { source: string }) {
  const [compiledSource, setCompiledSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const result = await previewSublesson(source);
        if (cancelled) return;
        if ("error" in result) {
          setError(result.error);
        } else {
          setCompiledSource(result.compiledSource);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("The preview couldn't be loaded.");
      }
    }, PREVIEW_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [source]);

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="flex gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <pre className="min-w-0 overflow-x-auto font-mono text-xs whitespace-pre-wrap">{error}</pre>
        </div>
      )}
      {compiledSource ? (
        <div className="prose prose-invert max-w-none">
          <MDXRemote compiledSource={compiledSource} scope={{}} frontmatter={{}} components={components} />
        </div>
      ) : (
        !error && <p className="text-sm text-muted-foreground">The preview shows up here as you write.</p>
      )}
    </div>
  );
}
