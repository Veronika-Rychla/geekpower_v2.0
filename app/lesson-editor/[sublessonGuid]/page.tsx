import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCurrentUser } from "@/lib/guards";
import { getEditableSublesson, getSublessonVersions } from "@/lib/lessons";
import { hasTeacherAccess, isGuid } from "@/lib/utils";
import { SublessonEditor } from "@/components/lessons/editor/sublesson-editor";
import { getDictionary } from "@/lib/dictionary";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).editor.editSection };
}

export default async function EditSublessonPage({ params }: PageProps<"/lesson-editor/[sublessonGuid]">) {
  const user = await getCurrentUser();
  if (!hasTeacherAccess(user?.role)) {
    notFound();
  }

  const { sublessonGuid } = await params;
  // A malformed guid would make Postgres throw instead of finding nothing
  if (!isGuid(sublessonGuid)) {
    notFound();
  }
  const [sublesson, versions] = await Promise.all([
    getEditableSublesson(sublessonGuid),
    getSublessonVersions(sublessonGuid),
  ]);
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
      history={{ current: sublesson.saved, versions }}
    />
  );
}
