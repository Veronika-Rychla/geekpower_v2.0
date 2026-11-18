"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface DeleteDialogProps {
  /** What is being deleted, e.g. "announcement" or "blog post". */
  itemLabel: string;
  /** The item's title, quoted in the confirmation text. */
  title: string;
  /** Server action with the item's id already bound, e.g. `deleteBlogPost.bind(null, guid)`. */
  onDelete: () => Promise<unknown>;
}

export function DeleteDialog({
  itemLabel,
  title,
  onDelete,
}: DeleteDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await onDelete();
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete ${itemLabel}`}
          />
        }
      >
        <Trash2 className="size-3.5" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this {itemLabel}?</DialogTitle>
          <DialogDescription>
            &ldquo;{title}&rdquo; will be removed for everyone. This can&apos;t
            be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            Cancel
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={handleDelete}
          >
            {isPending ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
