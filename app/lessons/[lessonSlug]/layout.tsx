import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { LessonSidebar } from "@/components/lessons/lesson-sidebar";
import { getLesson } from "@/lib/lessons";

export default async function LessonLayout({
  children,
  params,
}: LayoutProps<"/lessons/[lessonSlug]">) {
  const { lessonSlug } = await params;

  const session = await auth();
  if (!session?.user?.guid || !session.user.role) {
    return null;
  }

  const lesson = await getLesson({ guid: session.user.guid, role: session.user.role }, lessonSlug);
  if (!lesson) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col md:flex-row">
      <LessonSidebar
        lessonSlug={lesson.slug}
        lessonTitle={lesson.title}
        sublessons={lesson.sublessons}
        showProgress={session.user.role !== "admin"}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
