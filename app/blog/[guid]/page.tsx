import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { cache } from "react";

import { getCurrentUser } from "@/lib/guards";
import { getBlogPost } from "@/lib/blog";
import { formatDateTime } from "@/lib/dates";
import { getDictionary, getLocale } from "@/lib/dictionary";
import { fill } from "@/lib/i18n";
import { hasTeacherAccess } from "@/lib/utils";
import { BlogPostActions } from "@/components/blog/blog-post-actions";
import { BlogPostBadges } from "@/components/blog/blog-post-badges";
import { BlogMarkdown } from "@/components/blog/markdown/blog-markdown";

/** Cached so metadata and the page share one query. */
const loadPost = cache(async (guid: string) => {
  const user = await getCurrentUser();
  return getBlogPost(guid, { includeDrafts: hasTeacherAccess(user?.role) });
});

export async function generateMetadata({
  params,
}: PageProps<"/blog/[guid]">): Promise<Metadata> {
  const post = await loadPost((await params).guid);
  return {
    title: post?.title ?? (await getDictionary()).blog.title,
    description: post?.summary,
  };
}

export default async function BlogPostPage({
  params,
}: PageProps<"/blog/[guid]">) {
  const post = await loadPost((await params).guid);
  if (!post) {
    notFound();
  }
  const canManage = hasTeacherAccess((await getCurrentUser())?.role);
  const [{ blog: t, common }, locale] = await Promise.all([
    getDictionary(),
    getLocale(),
  ]);

  return (
    <article className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-16">
      <Link
        href="/blog"
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        {t.back}
      </Link>
      <div className="flex items-start justify-between gap-2">
        <BlogPostBadges post={post} />
        {canManage && (
          <BlogPostActions
            guid={post.guid}
            title={post.title}
            redirectAfterDelete
            className="-mt-1"
          />
        )}
      </div>
      <h1 className="text-3xl font-semibold">{post.title}</h1>
      <p className="text-sm text-muted-foreground">
        {post.authorName} · {formatDateTime(post.createdAt, locale)}
        {post.updatedAt && common.edited} ·{" "}
        {fill(common.minRead, { minutes: post.readTime })}
      </p>
      <p className="text-lg whitespace-pre-wrap text-muted-foreground">
        {post.summary}
      </p>
      <div className="prose prose-invert max-w-none">
        <BlogMarkdown content={post.message} />
      </div>
    </article>
  );
}
