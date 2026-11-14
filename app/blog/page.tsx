import type { Metadata } from "next";
import Link from "next/link";

import { getBlogPosts } from "@/lib/blog";
import { getCurrentUser } from "@/lib/guards";
import { formatDateTime, hasTeacherAccess } from "@/lib/utils";
import { BlogPostBadges } from "@/components/blog/blog-post-badges";
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
  // Teachers and admins also see drafts, so they can check them before publishing
  const posts = await getBlogPosts({
    includeDrafts: hasTeacherAccess(user?.role),
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">Blog</h1>

      {posts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No blog posts yet.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {posts.map((post) => (
            <li key={post.guid}>
              <Link href={`/blog/${post.guid}`} className="group block">
                <Card className="transition-colors group-hover:bg-muted/50">
                  <CardHeader>
                    <BlogPostBadges post={post} />
                    <CardTitle className="mt-1 group-hover:underline">
                      {post.title}
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
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
