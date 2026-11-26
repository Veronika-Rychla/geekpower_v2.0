import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { getLesson } from "@/lib/lessons";

export default async function LessonIndexPage({ params }: PageProps<"/lessons/[lessonSlug]">) {
  const { lessonSlug } = await params;

  const session = await auth();
  if (!session?.user?.guid || !session.user.role) {
    return null;
  }

  const lesson = await getLesson({ guid: session.user.guid, role: session.user.role }, lessonSlug);
  if (!lesson || lesson.sublessons.length === 0) {
    notFound();
  }

  // Resume at the first unfinished sublesson; once everything is done, start from the beginning.
  const target = lesson.sublessons.find((s) => !s.completedAt) ?? lesson.sublessons[0];
  redirect(`/lessons/${lesson.slug}/${target.slug}`);
}
