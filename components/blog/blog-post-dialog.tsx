"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { BlogPostForm } from "@/components/blog/blog-post-form";
import type { BlogMessage } from "@/lib/types";

interface BlogPostDialogProps {
  /** Pass an existing post to edit it; omit to create a new one. */
  post?: Pick<
    BlogMessage,
    "guid" | "title" | "summary" | "message" | "type" | "isDraft"
  >;
}

export function BlogPostDialog({ post }: BlogPostDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {post ? (
        <DialogTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Edit blog post"
            />
          }
        >
          <Pencil className="size-3.5" />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button size="sm" />}>
          <Plus className="size-3.5" />
          New
        </DialogTrigger>
      )}
      <DialogContent>
        <BlogPostForm
          guid={post?.guid}
          defaultValues={
            post && {
              title: post.title,
              summary: post.summary,
              message: post.message,
              type: post.type,
              isDraft: post.isDraft,
            }
          }
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
