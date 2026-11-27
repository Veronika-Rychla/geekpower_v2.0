import Link from "next/link";
import { Plus } from "lucide-react";

import type { BlogMessage } from "@/lib/types";
import { formatDateTime } from "@/lib/dates";
import { getDictionary, getLocale } from "@/lib/dictionary";
import { fill } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { BlogPostActions } from "@/components/blog/blog-post-actions";
import { BlogPostBadges } from "@/components/blog/blog-post-badges";
import { BlogMarkdown } from "@/components/blog/markdown/blog-markdown";
import { buttonVariants } from "@/components/ui/button";

interface BlogPostListProps {
  posts: BlogMessage[];
  /** Shows edit and delete buttons on each post. */
  canManage?: boolean;
}

export async function BlogPostList({
  posts,
  canManage = false,
}: BlogPostListProps) {
  const [{ blog: t, common }, locale] = await Promise.all([
    getDictionary(),
    getLocale(),
  ]);

  if (posts.length === 0) {
    return <p className="text-sm text-muted-foreground">{t.empty}</p>;
  }

  return (
    <ul className="-mr-2 flex max-h-112 flex-col divide-y divide-foreground/10 overflow-y-auto pr-2">
      {posts.map((post) => (
        <li
          key={post.guid}
          className={cn(
            "flex flex-col gap-1 border-l-4 py-3 pl-3 first:pt-0 last:pb-0",
            post.isDraft
              ? "border-l-muted-foreground/40"
              : "border-l-violet-500",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col items-start gap-1">
              <BlogPostBadges post={post} />
              <h3 className="font-medium">
                <Link href={`/blog/${post.guid}`} className="hover:underline">
                  {post.title}
                </Link>
              </h3>
            </div>
            {canManage && (
              <BlogPostActions
                guid={post.guid}
                title={post.title}
                className="-mt-1"
              />
            )}
          </div>
          <p className="whitespace-pre-wrap text-muted-foreground">
            {post.summary}
          </p>
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-primary select-none">
              <span className="group-open:hidden">{t.readMore}</span>
              <span className="hidden group-open:inline">{t.showLess}</span>
              <span className="text-muted-foreground">
                {" "}
                · {fill(common.minRead, { minutes: post.readTime })}
              </span>
            </summary>
            <div className="prose prose-sm prose-invert mt-2 max-w-none">
              <BlogMarkdown content={post.message} />
            </div>
          </details>
          <p className="text-right text-xs text-muted-foreground">
            {post.authorName} · {formatDateTime(post.createdAt, locale)}
            {post.updatedAt && common.edited}
          </p>
        </li>
      ))}
    </ul>
  );
}

/** "New" button for the dashboard's Blog section; opens the full-page editor. */
export async function NewBlogPostLink() {
  const t = (await getDictionary()).common;

  return (
    <Link href="/blog/new" className={buttonVariants({ size: "sm" })}>
      <Plus className="size-3.5" />
      {t.new}
    </Link>
  );
}
