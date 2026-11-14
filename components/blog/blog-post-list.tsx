import Link from "next/link";

import type { BlogMessage } from "@/lib/types";
import { deleteBlogPost } from "@/lib/actions";
import { cn, formatDateTime } from "@/lib/utils";
import { BlogPostBadges } from "@/components/blog/blog-post-badges";
import { BlogPostDialog } from "@/components/blog/blog-post-dialog";
import { DeleteDialog } from "@/components/delete-dialog";

interface BlogPostListProps {
  posts: BlogMessage[];
  /** Shows edit and delete buttons on each post. */
  canManage?: boolean;
}

export function BlogPostList({ posts, canManage = false }: BlogPostListProps) {
  if (posts.length === 0) {
    return <p className="text-sm text-muted-foreground">No blog posts yet.</p>;
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
              <div className="-mt-1 flex shrink-0 gap-1">
                <BlogPostDialog post={post} />
                <DeleteDialog
                  itemLabel="blog post"
                  title={post.title}
                  onDelete={deleteBlogPost.bind(null, post.guid)}
                />
              </div>
            )}
          </div>
          <p className="whitespace-pre-wrap text-muted-foreground">
            {post.summary}
          </p>
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-primary select-none">
              <span className="group-open:hidden">Read more</span>
              <span className="hidden group-open:inline">Show less</span>
              <span className="text-muted-foreground">
                {" "}
                · {post.readTime} min read
              </span>
            </summary>
            <p className="mt-2 whitespace-pre-wrap">{post.message}</p>
          </details>
          <p className="text-right text-xs text-muted-foreground">
            {post.authorName} · {formatDateTime(post.createdAt)}
            {post.updatedAt && " (edited)"}
          </p>
        </li>
      ))}
    </ul>
  );
}
