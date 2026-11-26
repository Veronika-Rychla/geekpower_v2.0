"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Pencil, Plus } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createLesson, updateLesson } from "@/lib/actions";
import { SLUG_MAX_LENGTH, SLUG_PATTERN, slugify } from "@/lib/slug";

interface LessonFields {
  title: string;
  slug: string;
  isDraft: boolean;
}

interface LessonDialogProps {
  /** Pass an existing lesson to edit it; omit to create a new one. */
  lesson?: { guid: string } & LessonFields;
}

/** Create or edit a lesson's title, name in URL (slug) and draft state. Its sections are edited separately. */
export function LessonDialog({ lesson }: LessonDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {lesson ? (
        <DialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Edit lesson" title="Edit lesson" />}>
          <Pencil className="size-3.5" />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button size="sm" />}>
          <Plus className="size-3.5" />
          New lesson
        </DialogTrigger>
      )}
      <DialogContent>
        {/* Remounted on every open so a cancelled edit doesn't linger */}
        {open && <LessonForm lesson={lesson} onSuccess={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function LessonForm({ lesson, onSuccess }: LessonDialogProps & { onSuccess: () => void }) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    getFieldState,
    formState: { errors, isSubmitting },
  } = useForm<LessonFields>({
    defaultValues: lesson ?? { title: "", slug: "", isDraft: true },
  });

  const idPrefix = lesson ? `lesson-${lesson.guid}` : "lesson-new";

  async function onSubmit(data: LessonFields) {
    setFormError(null);
    const result = lesson ? await updateLesson(lesson.guid, data) : await createLesson(data);
    if ("error" in result) {
      setFormError(result.error);
      return;
    }
    onSuccess();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{lesson ? "Edit lesson" : "New lesson"}</DialogTitle>
        {!lesson && (
          <DialogDescription>
            New lessons start as drafts. Add sections to it, then untick Draft to show it to students.
          </DialogDescription>
        )}
      </DialogHeader>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-title`}>Title</Label>
          <Input
            id={`${idPrefix}-title`}
            aria-invalid={!!errors.title}
            {...register("title", {
              validate: (value) => value.trim().length > 0 || "Title is required",
              maxLength: { value: 200, message: "Title must be at most 200 characters" },
              onChange: (event) => {
                // A new lesson's slug follows the title until it's edited by hand
                if (!lesson && !getFieldState("slug").isDirty) {
                  setValue("slug", slugify(event.target.value));
                }
              },
            })}
          />
          {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
        </div>

        <SlugField
          id={`${idPrefix}-slug`}
          error={errors.slug?.message}
          kind="lesson"
          warnOnChange={!!lesson}
          {...register("slug", slugRules)}
        />

        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" className="size-4 accent-primary" {...register("isDraft")} />
          Draft (hidden from students)
        </label>

        {formError && <p className="text-sm text-destructive">{formError}</p>}

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : lesson ? "Save changes" : "Create lesson"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

export const slugRules = {
  validate: (value: string) => value.trim().length > 0 || "Name in URL is required",
  maxLength: { value: SLUG_MAX_LENGTH, message: `Name in URL must be at most ${SLUG_MAX_LENGTH} characters` },
  pattern: { value: SLUG_PATTERN, message: "Use lowercase letters, digits and single dashes only" },
};

/** The URL slug input ("Name in URL"), shared by the lesson dialog and the section editor. */
export function SlugField({
  id,
  error,
  warnOnChange,
  kind,
  ...props
}: React.ComponentProps<typeof Input> & {
  id: string;
  error?: string;
  warnOnChange?: boolean;
  kind: "lesson" | "section";
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>Name in URL</Label>
      <Input id={id} aria-invalid={!!error} className="font-mono" {...props} />
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          The name this {kind} appears as in the page&apos;s web address (URL). Lowercase letters, digits and dashes
          only, e.g. <span className="font-mono">{kind === "lesson" ? "it-basics" : "new-words"}</span>.
          {warnOnChange && " Changing it changes the address, so old links stop working."}
        </p>
      )}
    </div>
  );
}
