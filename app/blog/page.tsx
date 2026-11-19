import type { Metadata } from "next";
import Link from "next/link";

import { getBlogPosts } from "@/lib/blog";
import { getCurrentUser } from "@/lib/guards";
import { formatDateTime } from "@/lib/dates";
import { hasTeacherAccess } from "@/lib/utils";
import { BlogPostActions } from "@/components/blog/blog-post-actions";
import { BlogPostBadges } from "@/components/blog/blog-post-badges";
import { NewBlogPostLink } from "@/components/blog/blog-post-list";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Blog",
};

export default async function BlogPage() {
  const user = await getCurrentUser();
  const canManage = hasTeacherAccess(user?.role);
  // Teachers and admins also see drafts, so they can check them before publishing
  const posts = await getBlogPosts({ includeDrafts: canManage });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Blog</h1>
        {canManage && <NewBlogPostLink />}
      </div>

      {posts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No blog posts yet.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {posts.map((post) => (
            <li key={post.guid}>
              {/* The title link stretches over the whole card (after:inset-0), so the card stays
                  clickable without nesting the edit/delete buttons inside a link. */}
              <Card className="relative transition-colors has-[a[data-card-link]:hover]:bg-muted/50">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <BlogPostBadges post={post} />
                    {canManage && (
                      <BlogPostActions
                        guid={post.guid}
                        title={post.title}
                        className="relative z-10 -mt-1"
                      />
                    )}
                  </div>
                  <CardTitle className="mt-1">
                    <Link
                      href={`/blog/${post.guid}`}
                      data-card-link
                      className="after:absolute after:inset-0 after:rounded-[inherit] hover:underline"
                    >
                      {post.title}
                    </Link>
                  </CardTitle>
                  <CardDescription>
                    {post.authorName} · {formatDateTime(post.createdAt)} ·{" "}
                    {post.readTime} min read
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-muted-foreground">
                    {post.summary}
                  </p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
