import Link from "next/link";
import { Pencil } from "lucide-react";

import { deleteBlogPost } from "@/lib/actions";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { DeleteDialog } from "@/components/delete-dialog";
import { getDictionary } from "@/lib/dictionary";

interface BlogPostActionsProps {
  guid: string;
  title: string;
  /** Go to /blog after deleting; for the post's own page, which no longer exists then. */
  redirectAfterDelete?: boolean;
  className?: string;
}

/** Edit and delete buttons for one post. Render only for teachers/admins. */
export async function BlogPostActions({
  guid,
  title,
  redirectAfterDelete = false,
  className,
}: BlogPostActionsProps) {
  const t = await getDictionary();

  return (
    <div className={cn("flex shrink-0 gap-1", className)}>
      <Link
        href={`/blog/${guid}/edit`}
        aria-label={t.blog.editLabel}
        title={t.common.edit}
        className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
      >
        <Pencil className="size-3.5" />
      </Link>
      <DeleteDialog
        item="blogPost"
        title={title}
        onDelete={deleteBlogPost.bind(null, guid, redirectAfterDelete)}
      />
    </div>
  );
}
