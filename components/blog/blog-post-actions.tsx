import Link from "next/link";
import { Pencil } from "lucide-react";

import { deleteBlogPost } from "@/lib/actions";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { DeleteDialog } from "@/components/delete-dialog";

interface BlogPostActionsProps {
  guid: string;
  title: string;
  /** Go to /blog after deleting; for the post's own page, which no longer exists then. */
  redirectAfterDelete?: boolean;
  className?: string;
}

/** Edit and delete buttons for one post. Render only for teachers/admins. */
export function BlogPostActions({
  guid,
  title,
  redirectAfterDelete = false,
  className,
}: BlogPostActionsProps) {
  return (
    <div className={cn("flex shrink-0 gap-1", className)}>
      <Link
        href={`/blog/${guid}/edit`}
        aria-label="Edit blog post"
        title="Edit"
        className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
      >
        <Pencil className="size-3.5" />
      </Link>
      <DeleteDialog
        itemLabel="blog post"
        title={title}
        onDelete={deleteBlogPost.bind(null, guid, redirectAfterDelete)}
      />
    </div>
  );
}
