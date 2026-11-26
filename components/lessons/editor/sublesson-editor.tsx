"use client";

import { useDeferredValue, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarkdownEditorPane } from "@/components/markdown-editor/markdown-editor-pane";
import {
  EditorViewTabs,
  useUnsavedChangesWarning,
  type EditorView,
} from "@/components/markdown-editor/editor-chrome";
import { LessonPreview } from "@/components/lessons/editor/lesson-preview";
import { QuizToolbarButton } from "@/components/lessons/editor/quiz-dialog";
import { SlugField, slugRules } from "@/components/lessons/manage/lesson-dialog";
import { createSublesson, updateSublesson } from "@/lib/actions";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";

export interface SublessonFields {
  title: string;
  slug: string;
  body: string;
  isDraft: boolean;
}

interface SublessonEditorProps {
  lesson: { guid: string; slug: string; title: string };
  /** When set, the editor updates this section; otherwise it creates a new one in `lesson`. */
  sublesson?: { guid: string } & SublessonFields;
}

/** Full-page editor for one lesson section: MDX on the left, live preview on the right. */
export function SublessonEditor({ lesson, sublesson }: SublessonEditorProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [mobileView, setMobileView] = useState<EditorView>("write");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const {
    register,
    handleSubmit,
    control,
    getValues,
    setValue,
    getFieldState,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SublessonFields>({
    defaultValues: sublesson ?? { title: "", slug: "", body: "", isDraft: true },
  });

  const body = useWatch({ control, name: "body" });
  const previewBody = useDeferredValue(body);

  useUnsavedChangesWarning(isDirty);

  const idPrefix = sublesson ? `sublesson-${sublesson.guid}` : "sublesson-new";
  const cancelHref = sublesson ? `/lessons/${lesson.slug}/${sublesson.slug}` : "/lessons";

  async function onSubmit(data: SublessonFields) {
    setFormError(null);
    if (uploadingCount > 0) {
      setFormError("Wait until the images finish uploading.");
      return;
    }

    const result = sublesson ? await updateSublesson(sublesson.guid, data) : await createSublesson(lesson.guid, data);
    if ("error" in result) {
      setFormError(result.error);
      return;
    }

    router.push(result.href);
  }

  function onKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      void handleSubmit(onSubmit)();
    }
  }

  return (
    <form
      className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-6 sm:px-6"
      onSubmit={handleSubmit(onSubmit)}
      onKeyDown={onKeyDown}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">{lesson.title}</p>
          <h1 className="text-xl font-semibold">{sublesson ? "Edit section" : "New section"}</h1>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" className="size-4 accent-primary" {...register("isDraft")} />
            Draft
          </label>
          <Link
            href={cancelHref}
            className={buttonVariants({ variant: "outline", size: "sm" })}
            onClick={(event) => {
              if (isDirty && !window.confirm("Discard unsaved changes?")) {
                event.preventDefault();
              }
            }}
          >
            Cancel
          </Link>
          <Button type="submit" size="sm" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {formError && (
        <pre className="rounded-md border border-destructive/50 bg-destructive/10 p-3 font-mono text-xs whitespace-pre-wrap text-destructive">
          {formError}
        </pre>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-title`}>Title</Label>
          <Input
            id={`${idPrefix}-title`}
            aria-invalid={!!errors.title}
            {...register("title", {
              validate: (value) => value.trim().length > 0 || "Title is required",
              maxLength: { value: 200, message: "Title must be at most 200 characters" },
              onChange: (event) => {
                // A new section's slug follows the title until it's edited by hand
                if (!sublesson && !getFieldState("slug").isDirty) {
                  setValue("slug", slugify(event.target.value));
                }
              },
            })}
          />
          {errors.title ? (
            <p className="text-sm text-destructive">{errors.title.message}</p>
          ) : (
            <p className="text-xs text-muted-foreground">Shown in the lesson menu.</p>
          )}
        </div>
        <SlugField
          id={`${idPrefix}-slug`}
          error={errors.slug?.message}
          kind="section"
          warnOnChange={!!sublesson}
          {...register("slug", slugRules)}
        />
      </div>

      <EditorViewTabs view={mobileView} onChange={setMobileView} />

      <div className="grid gap-4 lg:grid-cols-2">
        <MarkdownEditorPane
          id={`${idPrefix}-body`}
          label="Content (MDX)"
          placeholder="Piš v Markdownu… Kvíz vložíš tlačítkem v liště, obrázky přes Ctrl+V nebo přetažením."
          field={register("body", {
            validate: (value) => value.trim().length > 0 || "Content is required",
          })}
          textareaRef={textareaRef}
          getValue={() => getValues("body")}
          setValue={(value) => setValue("body", value, { shouldDirty: true })}
          imageFolder="lessons"
          onUploadingChange={setUploadingCount}
          hint={"MDX · write \\{ and \\} for literal braces · Ctrl+S saves"}
          isDirty={isDirty}
          invalid={!!errors.body}
          toolbarExtras={<QuizToolbarButton textareaRef={textareaRef} />}
          className={cn(mobileView !== "write" && "max-lg:hidden")}
        />

        <div
          className={cn(
            "h-[70vh] min-h-96 overflow-y-auto rounded-md border border-input p-4 sm:p-6",
            mobileView !== "preview" && "max-lg:hidden",
          )}
          aria-label="Preview"
        >
          <LessonPreview source={previewBody} />
        </div>
      </div>

      {errors.body && <p className="text-sm text-destructive">{errors.body.message}</p>}
    </form>
  );
}
