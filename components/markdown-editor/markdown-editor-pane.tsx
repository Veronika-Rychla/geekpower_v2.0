"use client";

import {
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type ReactNode,
  type RefObject,
} from "react";
import type { UseFormRegisterReturn } from "react-hook-form";

import { MarkdownToolbar } from "@/components/markdown-editor/markdown-toolbar";
import { insertBlock } from "@/components/markdown-editor/markdown-editing";
import {
  ACCEPTED_IMAGE_TYPES,
  isUploadableImage,
  uploadImage,
} from "@/components/markdown-editor/upload-image";
import type { ImageFolder } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";
import { useDictionary } from "@/components/i18n-provider";
import { fill } from "@/lib/i18n";

interface MarkdownEditorPaneProps {
  id: string;
  label: string;
  placeholder: string;
  /** The textarea's react-hook-form registration (its `ref` is merged with `textareaRef`). */
  field: UseFormRegisterReturn;
  /** Owned by the parent, so other UI (e.g. a dialog) can edit the text too. */
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  getValue: () => string;
  setValue: (value: string) => void;
  imageFolder: ImageFolder;
  /** Called with the number of images still uploading; save should wait for 0. */
  onUploadingChange: (count: number) => void;
  /** Footer text while nothing is uploading. */
  hint: string;
  isDirty: boolean;
  invalid?: boolean;
  /** Extra toolbar buttons. */
  toolbarExtras?: ReactNode;
  className?: string;
}

/** "Můj obrázek.final.png" → "Můj obrázek.final" (brackets would break the Markdown). */
function altFromFileName(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/[[\]]/g, "") || "obrázek";
}

function imageFiles(files: FileList): File[] {
  return Array.from(files).filter((file) => file.type.startsWith("image/"));
}

/**
 * The writing half of a Markdown editor: toolbar, textarea and image uploads
 * (paste, drop or the toolbar button) straight to Cloudinary. Shared by the
 * blog and lesson editors.
 */
export function MarkdownEditorPane({
  id,
  label,
  placeholder,
  field,
  textareaRef,
  getValue,
  setValue,
  imageFolder,
  onUploadingChange,
  hint,
  isDirty,
  invalid = false,
  toolbarExtras,
  className,
}: MarkdownEditorPaneProps) {
  const t = useDictionary().markdownEditor;
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingCount, setUploadingCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadCounter = useRef(0);
  const uploadingRef = useRef(0);

  const { ref: registerRef, ...fieldProps } = field;

  function changeUploading(delta: number) {
    uploadingRef.current += delta;
    setUploadingCount(uploadingRef.current);
    onUploadingChange(uploadingRef.current);
  }

  /** Swaps an upload placeholder for the final Markdown, keeping the caret where it was. */
  function replacePlaceholder(placeholder: string, replacement: string) {
    const value = getValue();
    const index = value.indexOf(placeholder);
    if (index === -1) return; // removed while uploading

    const textarea = textareaRef.current;
    const hadFocus = !!textarea && document.activeElement === textarea;
    const selection = textarea
      ? [textarea.selectionStart, textarea.selectionEnd]
      : [0, 0];

    setValue(
      value.slice(0, index) +
        replacement +
        value.slice(index + placeholder.length),
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
      setUploadError(t.onlyImages);
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
    changeUploading(jobs.length);

    await Promise.all(
      jobs.map(async ({ file, alt, placeholder }) => {
        let replacement = "";
        try {
          const url = await uploadImage(file, imageFolder, t);
          replacement = `![${alt}](${url})`;
        } catch (error) {
          setUploadError(
            `${file.name}: ${error instanceof Error ? error.message : t.uploadFailed}`,
          );
        }
        replacePlaceholder(placeholder, replacement);
        changeUploading(-1);
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

  return (
    <div
      className={cn(
        "flex h-[70vh] min-h-96 flex-col rounded-md border border-input transition-[color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30",
        invalid && "border-destructive",
        className,
      )}
    >
      <MarkdownToolbar
        textareaRef={textareaRef}
        onPickImage={() => fileInputRef.current?.click()}
      >
        {toolbarExtras}
      </MarkdownToolbar>
      <textarea
        id={id}
        aria-label={label}
        aria-invalid={invalid}
        placeholder={placeholder}
        className="flex-1 resize-none bg-transparent p-3 font-mono text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
        spellCheck
        onPaste={onPaste}
        onDragOver={onDragOver}
        onDrop={onDrop}
        ref={(element) => {
          registerRef(element);
          textareaRef.current = element;
        }}
        {...fieldProps}
      />
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-input px-3 py-1.5 text-xs text-muted-foreground">
        {uploadError ? (
          <span className="text-destructive">{uploadError}</span>
        ) : (
          <span>
            {uploadingCount > 0
              ? fill(t.uploading, { count: uploadingCount })
              : hint}
          </span>
        )}
        {isDirty && <span>{t.unsaved}</span>}
      </div>

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
    </div>
  );
}
