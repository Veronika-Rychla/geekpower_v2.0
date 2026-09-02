import { notFound } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import remarkFlexibleMarkers from "remark-flexible-markers";

import { auth } from "@/auth";
import { remarkCallouts } from "@/lib/mdx/remark-callouts";
import { getLesson, getSublessonSource } from "@/lib/lessons";

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
  const { content } = await compileMDX({
    source,
    options: {
      mdxOptions: { remarkPlugins: [remarkGfm, remarkFlexibleMarkers, remarkCallouts] },
      blockJS: false,
    },
  });

  return (
    <article className="prose prose-invert w-full max-w-3xl px-8 py-16">{content}</article>
  );
}
