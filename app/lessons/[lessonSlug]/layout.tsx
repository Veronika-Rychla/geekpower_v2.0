import { notFound } from "next/navigation";

import { getCurrentUser } from "@/lib/guards";
import { hasTeacherAccess } from "@/lib/utils";
import { LessonSidebar } from "@/components/lessons/lesson-sidebar";
import { getLesson } from "@/lib/lessons";

export default async function LessonLayout({
  children,
  params,
}: LayoutProps<"/lessons/[lessonSlug]">) {
  const { lessonSlug } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const lesson = await getLesson(user, lessonSlug);
  if (!lesson) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col md:flex-row">
      <LessonSidebar
        lessonSlug={lesson.slug}
        lessonTitle={lesson.displayTitle}
        sublessons={lesson.sublessons}
        showProgress={!hasTeacherAccess(user.role)}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
