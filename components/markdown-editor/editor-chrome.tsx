"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { useDictionary } from "@/components/i18n-provider";

export type EditorView = "write" | "preview";

/** Warns before closing the tab / reloading with unsaved changes. */
export function useUnsavedChangesWarning(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);
}

/** Write/Preview switch for narrow screens, where the two panes don't fit side by side. */
export function EditorViewTabs({
  view,
  onChange,
}: {
  view: EditorView;
  onChange: (view: EditorView) => void;
}) {
  const t = useDictionary().markdownEditor;

  return (
    <div className="flex gap-1 lg:hidden" role="tablist">
      {(["write", "preview"] as const).map((option) => (
        <Button
          key={option}
          type="button"
          role="tab"
          aria-selected={view === option}
          variant={view === option ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onChange(option)}
        >
          {option === "write" ? t.write : t.preview}
        </Button>
      ))}
    </div>
  );
}
