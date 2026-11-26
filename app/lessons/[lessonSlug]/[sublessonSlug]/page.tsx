import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";
import { CheckCircle2, Pencil } from "lucide-react";

import { getCurrentUser } from "@/lib/guards";
import { hasTeacherAccess } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { ChoiceQuiz } from "@/components/lessons/quiz/choice-quiz";
import { QUIZ_PART_COMPONENTS, readChoiceQuizParts } from "@/components/lessons/quiz/quiz-parts";
import { completeSublesson } from "@/lib/actions";
import { createQuizCollector, lessonMdxOptions } from "@/lib/mdx/lesson-mdx";
import { isResponseCorrect, type ChoiceQuizResponse } from "@/lib/quizzes";
import { getInteractions, getLesson, getSublessonBody } from "@/lib/lessons";

export default async function SublessonPage({
  params,
}: PageProps<"/lessons/[lessonSlug]/[sublessonSlug]">) {
  const { lessonSlug, sublessonSlug } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return null;
  }
  const isTeacher = hasTeacherAccess(user.role);

  const lesson = await getLesson(user, lessonSlug);
  const sublesson = lesson?.sublessons.find((s) => s.slug === sublessonSlug);
  if (!lesson || !sublesson) {
    notFound();
  }

  const [source, interactions] = await Promise.all([
    getSublessonBody(sublesson.guid),
    getInteractions(user.guid, sublesson.guid),
  ]);
  if (source === null) {
    notFound();
  }

  function QuizBlock({ id, children }: { id: string; children?: ReactNode }) {
    const { question, options } = readChoiceQuizParts(children);
    const saved = interactions[id]?.response as ChoiceQuizResponse | undefined;
    return (
      <ChoiceQuiz
        key={id}
        sublessonGuid={sublesson!.guid}
        quizId={id}
        question={question}
        options={options}
        initialSelectedId={saved?.selectedId}
        initialCorrect={saved?.correct}
      />
    );
  }

  const collector = createQuizCollector();
  const { content } = await compileMDX({
    source,
    components: {
      table: (props) => (
        <div className="overflow-x-auto">
          <table {...props} />
        </div>
      ),
      Quiz: QuizBlock,
      ...QUIZ_PART_COMPONENTS,
    },
    options: {
      mdxOptions: lessonMdxOptions(collector.onQuizzes),
      blockJS: true,
    },
  });

  const allQuizzesCorrect = collector.quizzes.every((quiz) => isResponseCorrect(interactions[quiz.id]?.response));

  return (
    <article className="prose prose-invert w-full max-w-3xl px-4 py-10 sm:px-8 sm:py-16">
      {isTeacher && (
        <div className="not-prose mb-6 flex items-center justify-end gap-3">
          {sublesson.isDraft && <span className="text-xs text-muted-foreground">Draft · hidden from students</span>}
          <Link
            href={`/lesson-editor/${sublesson.guid}`}
            className={buttonVariants({ variant: "outline", size: "sm", className: "gap-1.5" })}
          >
            <Pencil className="size-3.5" />
            Edit section
          </Link>
        </div>
      )}
      {content}
      {!isTeacher && (
        <form
          action={completeSublesson.bind(null, sublesson.guid)}
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
