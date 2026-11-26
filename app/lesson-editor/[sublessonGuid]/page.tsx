import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCurrentUser } from "@/lib/guards";
import { getEditableSublesson } from "@/lib/lessons";
import { hasTeacherAccess, isGuid } from "@/lib/utils";
import { SublessonEditor } from "@/components/lessons/editor/sublesson-editor";

export const metadata: Metadata = { title: "Edit section" };

export default async function EditSublessonPage({ params }: PageProps<"/lesson-editor/[sublessonGuid]">) {
  const user = await getCurrentUser();
  if (!hasTeacherAccess(user?.role)) {
    notFound();
  }

  const { sublessonGuid } = await params;
  // A malformed guid would make Postgres throw instead of finding nothing
  const sublesson = isGuid(sublessonGuid) ? await getEditableSublesson(sublessonGuid) : null;
  if (!sublesson) {
    notFound();
  }

  return (
    <SublessonEditor
      lesson={sublesson.lesson}
      sublesson={{
        guid: sublesson.guid,
        title: sublesson.title,
        slug: sublesson.slug,
        body: sublesson.body,
        isDraft: sublesson.isDraft,
      }}
    />
  );
}
