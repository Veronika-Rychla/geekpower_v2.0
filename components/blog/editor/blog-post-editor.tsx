"use client";

import {
  useDeferredValue,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BlogMarkdown } from "@/components/blog/markdown/blog-markdown";
import { estimateReadTime } from "@/components/blog/markdown/read-time";
import { MarkdownEditorPane } from "@/components/markdown-editor/markdown-editor-pane";
import {
  EditorViewTabs,
  useUnsavedChangesWarning,
  type EditorView,
} from "@/components/markdown-editor/editor-chrome";
import { createBlogPost, updateBlogPost } from "@/lib/actions";
import { BLOG_POST_TYPES, type BlogPostType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useDictionary } from "@/components/i18n-provider";
import { fill } from "@/lib/i18n";

export interface BlogPostFields {
  title: string;
  summary: string;
  message: string;
  type: BlogPostType[];
  isDraft: boolean;
}

interface BlogPostEditorProps {
  /** When set, the editor updates this post; otherwise it creates a new one. */
  guid?: string;
  defaultValues?: BlogPostFields;
}

const EMPTY_POST: BlogPostFields = {
  title: "",
  summary: "",
  message: "",
  type: [],
  isDraft: false,
};

export function BlogPostEditor({ guid, defaultValues }: BlogPostEditorProps) {
  const router = useRouter();
  const dictionary = useDictionary();
  const { common } = dictionary;
  const t = dictionary.blog;
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
    formState: { errors, isSubmitting, isDirty },
  } = useForm<BlogPostFields>({ defaultValues: defaultValues ?? EMPTY_POST });

  const message = useWatch({ control, name: "message" });
  // Lets typing stay responsive while the preview re-renders behind it
  const previewMessage = useDeferredValue(message);
  const readTime = useMemo(
    () => estimateReadTime(previewMessage),
    [previewMessage],
  );

  useUnsavedChangesWarning(isDirty);

  const idPrefix = guid ? `blog-${guid}` : "blog-new";
  const cancelHref = guid ? `/blog/${guid}` : "/dashboard";

  async function onSubmit(data: BlogPostFields) {
    setFormError(null);
    if (uploadingCount > 0) {
      setFormError(common.waitForUploads);
      return;
    }

    const result = guid
      ? await updateBlogPost(guid, data)
      : await createBlogPost(data);
    if ("error" in result) {
      setFormError(result.error);
      return;
    }

    router.push(`/blog/${result.guid}`);
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
        <h1 className="text-xl font-semibold">
          {guid ? t.editTitle : t.newTitle}
        </h1>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              {...register("isDraft")}
            />
            {common.draft}
          </label>
          <Link
            href={cancelHref}
            className={buttonVariants({ variant: "outline", size: "sm" })}
            onClick={(event) => {
              if (isDirty && !window.confirm(common.discardChanges)) {
                event.preventDefault();
              }
            }}
          >
            {common.cancel}
          </Link>
          <Button type="submit" size="sm" disabled={isSubmitting}>
            {isSubmitting ? common.saving : common.save}
          </Button>
        </div>
      </div>

      {formError && <p className="text-sm text-destructive">{formError}</p>}

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-title`}>{common.title}</Label>
        <Input
          id={`${idPrefix}-title`}
          aria-invalid={!!errors.title}
          {...register("title", {
            validate: (value) => value.trim().length > 0 || common.titleRequired,
            maxLength: {
              value: 200,
              message: fill(common.titleTooLong, { max: 200 }),
            },
          })}
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-summary`}>{t.summary}</Label>
        <Textarea
          id={`${idPrefix}-summary`}
          rows={2}
          className="min-h-0"
          aria-invalid={!!errors.summary}
          {...register("summary", {
            validate: (value) => value.trim().length > 0 || t.summaryRequired,
            maxLength: {
              value: 1000,
              message: fill(t.summaryTooLong, { max: 1000 }),
            },
          })}
        />
        {errors.summary && (
          <p className="text-sm text-destructive">{errors.summary.message}</p>
        )}
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">{t.type}</legend>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span aria-hidden className="text-sm leading-none font-medium">
              {t.type}
            </span>
            {BLOG_POST_TYPES.map((type) => (
              <label key={type} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  value={type}
                  className="size-4 accent-primary"
                  {...register("type", {
                    validate: (value) =>
                      value.length > 0 || t.typeRequired,
                  })}
                />
                {t.types[type]}
              </label>
            ))}
          </div>
          <span className="text-sm text-muted-foreground">
            {fill(t.estimatedRead, { minutes: readTime })}
          </span>
        </div>
        {errors.type && (
          <p className="text-sm text-destructive">{errors.type.message}</p>
        )}
      </fieldset>

      <EditorViewTabs view={mobileView} onChange={setMobileView} />

      <div className="grid gap-4 lg:grid-cols-2">
        <MarkdownEditorPane
          id={`${idPrefix}-message`}
          label={t.message}
          placeholder={t.messagePlaceholder}
          field={register("message", {
            validate: (value) => value.trim().length > 0 || t.messageRequired,
          })}
          textareaRef={textareaRef}
          getValue={() => getValues("message")}
          setValue={(value) =>
            setValue("message", value, { shouldDirty: true })
          }
          imageFolder="blog"
          onUploadingChange={setUploadingCount}
          hint={t.messageHint}
          isDirty={isDirty}
          invalid={!!errors.message}
          className={cn(mobileView !== "write" && "max-lg:hidden")}
        />

        <div
          className={cn(
            "h-[70vh] min-h-96 overflow-y-auto rounded-md border border-input p-4 sm:p-6",
            mobileView !== "preview" && "max-lg:hidden",
          )}
          aria-label={common.preview}
        >
          {previewMessage.trim() ? (
            <div className="prose prose-invert max-w-none">
              <BlogMarkdown content={previewMessage} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {common.previewEmpty}
            </p>
          )}
        </div>
      </div>

      {errors.message && (
        <p className="text-sm text-destructive">{errors.message.message}</p>
      )}
    </form>
  );
}
