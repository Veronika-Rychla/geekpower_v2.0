"use client";

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
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
import { MarkdownToolbar } from "@/components/blog/editor/markdown-toolbar";
import { insertBlock } from "@/components/blog/editor/markdown-editing";
import {
  ACCEPTED_IMAGE_TYPES,
  isUploadableImage,
  uploadBlogImage,
} from "@/components/blog/editor/upload-blog-image";
import { createBlogPost, updateBlogPost } from "@/lib/actions";
import { BLOG_POST_TYPES, type BlogPostType } from "@/lib/types";
import { cn } from "@/lib/utils";

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

/** "Můj obrázek.final.png" → "Můj obrázek.final" (brackets would break the Markdown). */
function altFromFileName(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/[[\]]/g, "") || "obrázek";
}

function imageFiles(files: FileList): File[] {
  return Array.from(files).filter((file) => file.type.startsWith("image/"));
}

export function BlogPostEditor({ guid, defaultValues }: BlogPostEditorProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [mobileView, setMobileView] = useState<"write" | "preview">("write");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadCounter = useRef(0);

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

  // Warn before closing the tab / reloading with unsaved changes
  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const { ref: registerMessageRef, ...messageField } = register("message", {
    validate: (value) => value.trim().length > 0 || "Message is required",
  });

  const idPrefix = guid ? `blog-${guid}` : "blog-new";
  const cancelHref = guid ? `/blog/${guid}` : "/dashboard";

  async function onSubmit(data: BlogPostFields) {
    setFormError(null);
    if (uploadingCount > 0) {
      setFormError("Wait until the images finish uploading.");
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

  /** Swaps an upload placeholder for the final Markdown, keeping the caret where it was. */
  function replacePlaceholder(placeholder: string, replacement: string) {
    const value = getValues("message");
    const index = value.indexOf(placeholder);
    if (index === -1) return; // removed while uploading

    const textarea = textareaRef.current;
    const hadFocus = !!textarea && document.activeElement === textarea;
    const selection = textarea
      ? [textarea.selectionStart, textarea.selectionEnd]
      : [0, 0];

    setValue(
      "message",
      value.slice(0, index) +
        replacement +
        value.slice(index + placeholder.length),
      { shouldDirty: true },
    );

    if (textarea && hadFocus) {
      const placeholderEnd = index + placeholder.length;
      const shift = (pos: number) =>
        pos >= placeholderEnd
          ? pos + replacement.length - placeholder.length
          : Math.min(pos, index + replacement.length);
      textarea.setSelectionRange(shift(selection[0]), shift(selection[1]));
    }
  }

  async function uploadImages(files: File[]) {
    const textarea = textareaRef.current;
    if (!textarea || files.length === 0) return;

    const images = files.filter(isUploadableImage);
    if (images.length < files.length) {
      setUploadError("Only JPEG, PNG, WebP and GIF images can be uploaded.");
    } else {
      setUploadError(null);
    }
    if (images.length === 0) return;

    const jobs = images.map((file) => {
      const alt = altFromFileName(file.name);
      const placeholder = `![Nahrávám ${alt} (${++uploadCounter.current})…]()`;
      return { file, alt, placeholder };
    });
    insertBlock(textarea, jobs.map((job) => job.placeholder).join("\n\n"));
    setUploadingCount((count) => count + jobs.length);

    await Promise.all(
      jobs.map(async ({ file, alt, placeholder }) => {
        let replacement = "";
        try {
          const url = await uploadBlogImage(file);
          replacement = `![${alt}](${url})`;
        } catch (error) {
          setUploadError(
            `${file.name}: ${error instanceof Error ? error.message : "Upload failed."}`,
          );
        }
        replacePlaceholder(placeholder, replacement);
        setUploadingCount((count) => count - 1);
      }),
    );
  }

  function onPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const files = imageFiles(event.clipboardData.files);
    if (files.length === 0) return; // normal text paste
    event.preventDefault();
    void uploadImages(files);
  }

  function onDragOver(event: DragEvent<HTMLTextAreaElement>) {
    if (event.dataTransfer.types.includes("Files")) {
      event.preventDefault();
    }
  }

  function onDrop(event: DragEvent<HTMLTextAreaElement>) {
    const files = imageFiles(event.dataTransfer.files);
    if (files.length === 0) return;
    event.preventDefault();
    void uploadImages(files);
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
          {guid ? "Edit blog post" : "New blog post"}
        </h1>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              {...register("isDraft")}
            />
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

      {formError && <p className="text-sm text-destructive">{formError}</p>}

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-title`}>Title</Label>
        <Input
          id={`${idPrefix}-title`}
          aria-invalid={!!errors.title}
          {...register("title", {
            validate: (value) => value.trim().length > 0 || "Title is required",
            maxLength: {
              value: 200,
              message: "Title must be at most 200 characters",
            },
          })}
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-summary`}>Summary</Label>
        <Textarea
          id={`${idPrefix}-summary`}
          rows={2}
          className="min-h-0"
          aria-invalid={!!errors.summary}
          {...register("summary", {
            validate: (value) =>
              value.trim().length > 0 || "Summary is required",
            maxLength: {
              value: 1000,
              message: "Summary must be at most 1000 characters",
            },
          })}
        />
        {errors.summary && (
          <p className="text-sm text-destructive">{errors.summary.message}</p>
        )}
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Type</legend>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span aria-hidden className="text-sm leading-none font-medium">
              Type
            </span>
            {BLOG_POST_TYPES.map((type) => (
              <label key={type} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  value={type}
                  className="size-4 accent-primary"
                  {...register("type", {
                    validate: (value) =>
                      value.length > 0 || "Pick at least one type",
                  })}
                />
                {type}
              </label>
            ))}
          </div>
          <span className="text-sm text-muted-foreground">
            ~{readTime} min read
          </span>
        </div>
        {errors.type && (
          <p className="text-sm text-destructive">{errors.type.message}</p>
        )}
      </fieldset>

      <div className="flex gap-1 lg:hidden" role="tablist">
        {(["write", "preview"] as const).map((view) => (
          <Button
            key={view}
            type="button"
            role="tab"
            aria-selected={mobileView === view}
            variant={mobileView === view ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setMobileView(view)}
          >
            {view === "write" ? "Write" : "Preview"}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div
          className={cn(
            "flex h-[70vh] min-h-96 flex-col rounded-md border border-input transition-[color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30",
            errors.message && "border-destructive",
            mobileView !== "write" && "max-lg:hidden",
          )}
        >
          <MarkdownToolbar
            textareaRef={textareaRef}
            onPickImage={() => fileInputRef.current?.click()}
          />
          <textarea
            id={`${idPrefix}-message`}
            aria-label="Message (Markdown)"
            aria-invalid={!!errors.message}
            placeholder="Piš v Markdownu… Obrázky můžeš vložit (Ctrl+V) nebo přetáhnout sem."
            className="flex-1 resize-none bg-transparent p-3 font-mono text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
            spellCheck
            onPaste={onPaste}
            onDragOver={onDragOver}
            onDrop={onDrop}
            ref={(element) => {
              registerMessageRef(element);
              textareaRef.current = element;
            }}
            {...messageField}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-input px-3 py-1.5 text-xs text-muted-foreground">
            <span>
              {uploadingCount > 0
                ? `Uploading ${uploadingCount} image${uploadingCount > 1 ? "s" : ""}…`
                : "Markdown · paste or drop images to upload"}
            </span>
            {isDirty && <span>Unsaved changes ●</span>}
          </div>
        </div>

        <div
          className={cn(
            "h-[70vh] min-h-96 overflow-y-auto rounded-md border border-input p-4 sm:p-6",
            mobileView !== "preview" && "max-lg:hidden",
          )}
          aria-label="Preview"
        >
          {previewMessage.trim() ? (
            <div className="prose prose-invert max-w-none">
              <BlogMarkdown content={previewMessage} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              The preview shows up here as you write.
            </p>
          )}
        </div>
      </div>

      {errors.message && (
        <p className="text-sm text-destructive">{errors.message.message}</p>
      )}
      {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        multiple
        hidden
        onChange={(event) => {
          if (event.target.files) {
            void uploadImages(Array.from(event.target.files));
          }
          event.target.value = "";
        }}
      />
    </form>
  );
}
