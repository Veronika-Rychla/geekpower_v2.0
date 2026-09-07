import { notFound } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import remarkFlexibleMarkers from "remark-flexible-markers";
import { CheckCircle2 } from "lucide-react";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Quiz, type QuizProps } from "@/components/lessons/quiz";
import { completeSublesson } from "@/lib/actions";
import { remarkCallouts } from "@/lib/mdx/remark-callouts";
import { extractQuizIds, getInteractions, getLesson, getSublessonSource } from "@/lib/lessons";

export default async function SublessonPage({
  params,
}: PageProps<"/lessons/[lessonSlug]/[sublessonSlug]">) {
  const { lessonSlug, sublessonSlug } = await params;

  const session = await auth();
  if (!session?.user?.guid || !session.user.role) {
    return null;
  }

  const lesson = await getLesson({ guid: session.user.guid, role: session.user.role }, lessonSlug);
  const sublesson = lesson?.sublessons.find((s) => s.slug === sublessonSlug);
  if (!lesson || !sublesson) {
    notFound();
  }

  const source = getSublessonSource(lessonSlug, sublessonSlug);
  const interactions = await getInteractions(session.user.guid, lessonSlug, sublessonSlug);

  const quizIds = extractQuizIds(source);
  const allQuizzesCorrect = quizIds.every((quizId) => {
    const response = interactions[quizId]?.response as { correct?: boolean } | undefined;
    return response?.correct === true;
  });

  function QuizBlock(props: QuizProps) {
    const saved = interactions[props.id]?.response as { selectedId?: string } | undefined;
    return (
      <Quiz
        {...props}
        lessonSlug={lessonSlug}
        sublessonSlug={sublessonSlug}
        initialSelectedId={saved?.selectedId}
      />
    );
  }

  const { content } = await compileMDX({
    source,
    components: {
      table: (props) => (
        <div className="overflow-x-auto">
          <table {...props} />
        </div>
      ),
      Quiz: QuizBlock,
    },
    options: {
      mdxOptions: { remarkPlugins: [remarkGfm, remarkFlexibleMarkers, remarkCallouts] },
      blockJS: false,
    },
  });

  return (
    <article className="prose prose-invert w-full max-w-3xl px-4 py-10 sm:px-8 sm:py-16">
      {content}
      {session.user.role !== "Admin" && (
        <form
          action={completeSublesson.bind(null, lessonSlug, sublessonSlug)}
          className="not-prose mt-8 flex flex-col items-start gap-2 border-t border-border pt-6"
        >
          {sublesson.completedAt ? (
            <Button type="submit" variant="outline" disabled className="gap-2">
              <CheckCircle2 className="size-4 text-primary" />
              Section completed
            </Button>
          ) : (
            <>
              <Button type="submit" disabled={!allQuizzesCorrect}>
                Finish section
              </Button>
              {!allQuizzesCorrect && (
                <p className="text-xs text-muted-foreground">
                  Answer all quizzes above correctly to finish this section.
                </p>
              )}
            </>
          )}
        </form>
      )}
    </article>
  );
}
