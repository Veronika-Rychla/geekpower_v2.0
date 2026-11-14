import type { BlogMessage } from "@/lib/types";

/** Draft marker plus one badge per type. */
export function BlogPostBadges({
  post,
}: {
  post: Pick<BlogMessage, "isDraft" | "type">;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {post.isDraft && (
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          Draft
        </span>
      )}
      {post.type.map((type) => (
        <span
          key={type}
          className="rounded-full bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-300"
        >
          {type}
        </span>
      ))}
    </div>
  );
}
