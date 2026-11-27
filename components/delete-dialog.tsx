"use client";

import { useId, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  /** Extra consequences to spell out, e.g. lost student progress. */
  description?: string;
  /**
   * When set, Delete stays disabled until this phrase is typed, e.g. `delete ${title}`.
   * Emoji and repeated spaces don't have to be typed (see `normalizeConfirmText`).
   */
  confirmText?: string;
}

/** Drops emoji (awkward to type) and collapses whitespace; letters, diacritics and case must still match. */
function normalizeConfirmText(text: string): string {
  return text
    .replace(/\p{Extended_Pictographic}|\u{FE0F}|\u{200D}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function DeleteDialog({
  itemLabel,
  title,
  onDelete,
  description,
  confirmText,
}: DeleteDialogProps) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [isPending, startTransition] = useTransition();
  const confirmInputId = useId();

  const phrase =
    confirmText === undefined ? null : normalizeConfirmText(confirmText);
  const confirmed = phrase === null || normalizeConfirmText(typed) === phrase;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setTyped("");
  }

  function handleDelete() {
    if (!confirmed || isPending) return;
    startTransition(async () => {
      await onDelete();
      handleOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
            {description && <> {description}</>}
          </DialogDescription>
        </DialogHeader>
        {phrase !== null && (
          <div className="flex flex-col gap-2">
            <Label
              htmlFor={confirmInputId}
              className="block cursor-text leading-normal font-normal select-text"
            >
              To confirm, type{" "}
              <code className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.9em] font-semibold text-foreground">
                {phrase}
              </code>
            </Label>
            <Input
              id={confirmInputId}
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleDelete();
              }}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={typed !== "" && !confirmed}
            />
          </div>
        )}
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            Cancel
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending || !confirmed}
            onClick={handleDelete}
          >
            {isPending ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
