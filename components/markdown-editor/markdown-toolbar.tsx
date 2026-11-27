"use client";

import { useRef, useState, type ReactNode, type RefObject } from "react";
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  SquarePlay,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { parseYoutubeUrl } from "@/components/blog/markdown/remark-youtube";
import {
  insertBlock,
  prefixLines,
  replaceSelection,
  wrapSelection,
} from "@/components/markdown-editor/markdown-editing";
import { useDictionary } from "@/components/i18n-provider";
import type { Dictionary } from "@/lib/dictionary";

type ToolbarLabel = keyof Dictionary["markdownEditor"]["toolbar"];

interface MarkdownToolbarProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onPickImage: () => void;
  /** Extra buttons after the built-in ones (e.g. the lesson editor's quiz button). */
  children?: ReactNode;
}

interface ToolbarAction {
  label: ToolbarLabel;
  icon: LucideIcon;
  run: (textarea: HTMLTextAreaElement) => void;
}

const FORMAT_ACTIONS: ToolbarAction[][] = [
  [
    {
      label: "bold",
      icon: Bold,
      run: (t) => wrapSelection(t, "**", "**", "tučně"),
    },
    {
      label: "italic",
      icon: Italic,
      run: (t) => wrapSelection(t, "*", "*", "kurzíva"),
    },
    {
      label: "code",
      icon: Code,
      run: (t) => wrapSelection(t, "`", "`", "code"),
    },
  ],
  [
    { label: "heading", icon: Heading2, run: (t) => prefixLines(t, "## ") },
    { label: "subheading", icon: Heading3, run: (t) => prefixLines(t, "### ") },
  ],
  [
    { label: "bulletList", icon: List, run: (t) => prefixLines(t, "- ") },
    {
      label: "numberedList",
      icon: ListOrdered,
      run: (t) => prefixLines(t, "1. "),
    },
    { label: "quote", icon: Quote, run: (t) => prefixLines(t, "> ") },
  ],
  [
    {
      label: "link",
      icon: Link2,
      run: (t) => {
        const selected = t.value.slice(t.selectionStart, t.selectionEnd);
        const text = selected || "text odkazu";
        const url = "https://";
        // Select the URL so it can be typed or pasted over right away
        replaceSelection(t, `[${text}](${url})`, [
          text.length + 3,
          text.length + 3 + url.length,
        ]);
      },
    },
  ],
];

export function MarkdownToolbar({
  textareaRef,
  onPickImage,
  children,
}: MarkdownToolbarProps) {
  const dictionary = useDictionary();
  const t = dictionary.markdownEditor;
  const [youtubeOpen, setYoutubeOpen] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
  // Inserted once the dialog has closed and focus is back in the textarea
  const pendingYoutubeUrl = useRef<string | null>(null);

  function run(action: ToolbarAction) {
    if (textareaRef.current) {
      action.run(textareaRef.current);
    }
  }

  function openYoutube(open: boolean) {
    setYoutubeOpen(open);
    if (open) {
      setYoutubeUrl("");
      setYoutubeError(null);
    }
  }

  function submitYoutube(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // The dialog is portaled out of the editor's <form> in the DOM, but React
    // still bubbles the submit through the component tree, which would save the post
    event.stopPropagation();
    if (!parseYoutubeUrl(youtubeUrl)) {
      setYoutubeError(t.youtube.invalid);
      return;
    }
    pendingYoutubeUrl.current = youtubeUrl.trim();
    setYoutubeOpen(false);
  }

  function insertPendingYoutube(open: boolean) {
    const url = pendingYoutubeUrl.current;
    if (open || !url || !textareaRef.current) return;
    pendingYoutubeUrl.current = null;
    insertBlock(textareaRef.current, url);
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-input p-1">
      {FORMAT_ACTIONS.map((group, i) => (
        <div key={i} className="flex items-center gap-0.5">
          {i > 0 && (
            <Separator
              orientation="vertical"
              className="mx-1 h-5 self-center"
            />
          )}
          {group.map((action) => (
            <ToolbarButton
              key={action.label}
              label={t.toolbar[action.label]}
              icon={action.icon}
              onClick={() => run(action)}
            />
          ))}
        </div>
      ))}
      <Separator orientation="vertical" className="mx-1 h-5 self-center" />
      <ToolbarButton
        label={t.toolbar.image}
        icon={ImageIcon}
        onClick={onPickImage}
      />
      <ToolbarButton
        label={t.toolbar.youtube}
        icon={SquarePlay}
        onClick={() => openYoutube(true)}
      />
      {children}

      <Dialog
        open={youtubeOpen}
        onOpenChange={openYoutube}
        onOpenChangeComplete={insertPendingYoutube}
      >
        <DialogContent finalFocus={textareaRef}>
          <DialogHeader>
            <DialogTitle>{t.youtube.title}</DialogTitle>
            <DialogDescription>{t.youtube.description}</DialogDescription>
          </DialogHeader>
          <form className="flex flex-col gap-4" onSubmit={submitYoutube}>
            <div className="flex flex-col gap-2">
              <Input
                type="url"
                placeholder="https://www.youtube.com/watch?v=…"
                value={youtubeUrl}
                onChange={(e) => {
                  setYoutubeUrl(e.target.value);
                  setYoutubeError(null);
                }}
                aria-invalid={!!youtubeError}
                autoFocus
              />
              {youtubeError && (
                <p className="text-sm text-destructive">{youtubeError}</p>
              )}
            </div>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>
                {dictionary.common.cancel}
              </DialogClose>
              <Button type="submit">{t.youtube.insert}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ToolbarButton({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <Icon />
    </Button>
  );
}
