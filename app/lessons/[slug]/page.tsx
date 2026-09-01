import { notFound } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";

import { Quiz } from "@/components/lessons/quiz";
import { getLessonSource } from "@/lib/lessons";

interface LessonFrontmatter {
  title: string;
  description?: string;
}

export default async function LessonPage({ params }: PageProps<"/lessons/[slug]">) {
  const { slug } = await params;

  let source: string;
  try {
    source = getLessonSource(slug);
  } catch {
    notFound();
  }

  const { content, frontmatter } = await compileMDX<LessonFrontmatter>({
    source,
    components: { Quiz },
    options: {
      parseFrontmatter: true,
      mdxOptions: { remarkPlugins: [remarkGfm] },
      // Lesson content lives in our own repo (content/lessons), not
      // user-submitted — safe to allow JS expressions in JSX props.
      blockJS: false,
    },
  });

  return (
    <article className="prose prose-invert mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <h1>{frontmatter.title}</h1>
      {content}
    </article>
  );
}
