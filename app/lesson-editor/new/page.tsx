import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCurrentUser } from "@/lib/guards";
import { getLessonSummary } from "@/lib/lessons";
import { hasTeacherAccess, isGuid } from "@/lib/utils";
import { SublessonEditor } from "@/components/lessons/editor/sublesson-editor";

export const metadata: Metadata = { title: "New section" };

/** `/lesson-editor/new?lesson=<lesson guid>` */
export default async function NewSublessonPage({ searchParams }: PageProps<"/lesson-editor/new">) {
  const user = await getCurrentUser();
  if (!hasTeacherAccess(user?.role)) {
    notFound();
  }

  const { lesson: lessonGuid } = await searchParams;
  const lesson =
    isGuid(lessonGuid) ? await getLessonSummary(lessonGuid) : null;
  if (!lesson) {
    notFound();
  }

  return <SublessonEditor lesson={lesson} />;
}
