import { notFound, redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/guards";
import { getLesson } from "@/lib/lessons";

export default async function LessonIndexPage({ params }: PageProps<"/lessons/[lessonSlug]">) {
  const { lessonSlug } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const lesson = await getLesson(user, lessonSlug);
  if (!lesson || lesson.sublessons.length === 0) {
    notFound();
  }

  // Resume at the first unfinished section; once everything is done, start from the beginning.
  const target = lesson.sublessons.find((s) => !s.completedAt) ?? lesson.sublessons[0];
  redirect(`/lessons/${lesson.slug}/${target.slug}`);
}
