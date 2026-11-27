"use client";

import { useRef, useState, type RefObject } from "react";
import { ListChecks } from "lucide-react";

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
import { ToolbarButton } from "@/components/markdown-editor/markdown-toolbar";
import { insertBlock, replaceSelection } from "@/components/markdown-editor/markdown-editing";
import { QUIZ_BUILDERS, type QuizDraft } from "@/components/lessons/editor/quiz-builders";
import { findQuizBlockAt, newQuizId, type QuizKind } from "@/lib/quizzes";
import { cn } from "@/lib/utils";
import { useDictionary } from "@/components/i18n-provider";

interface EditingQuiz {
  id: string;
  draft: QuizDraft;
  /** Where the existing block sits in the text; null for a new quiz. */
  range: { start: number; end: number } | null;
}

const KINDS = Object.keys(QUIZ_BUILDERS) as QuizKind[];

/**
 * Toolbar button + dialog for building a quiz. With the caret inside an
 * existing quiz block it edits that quiz (keeping its id, so students'
 * saved answers stay attached); otherwise it inserts a new one at the caret.
 */
export function QuizToolbarButton({ textareaRef }: { textareaRef: RefObject<HTMLTextAreaElement | null> }) {
  const dictionary = useDictionary();
  const t = dictionary.quizBuilder;
  const [editing, setEditing] = useState<EditingQuiz | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Applied once the dialog has closed and focus is back in the textarea
  const pendingInsert = useRef<{ text: string; range: EditingQuiz["range"] } | null>(null);

  function open() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    setError(null);

    const block = findQuizBlockAt(textarea.value, textarea.selectionStart);
    const draft = block && QUIZ_BUILDERS[block.kind].fromMdx(block.text);
    const id = block?.text.match(/\bid="([^"]+)"/)?.[1];
    if (block && draft && id) {
      setEditing({ id, draft, range: { start: block.start, end: block.end } });
    } else {
      setEditing({ id: newQuizId(textarea.value), draft: QUIZ_BUILDERS[KINDS[0]].empty(), range: null });
    }
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // The dialog is portaled out of the editor's <form> in the DOM, but React
    // still bubbles the submit through the component tree, which would save the section
    event.stopPropagation();
    if (!editing) return;

    const builder = QUIZ_BUILDERS[editing.draft.kind];
    const problem = builder.validate(editing.draft, t);
    if (problem) {
      setError(problem);
      return;
    }
    pendingInsert.current = { text: builder.toMdx(editing.draft, editing.id), range: editing.range };
    setEditing(null);
  }

  function applyPendingInsert(isOpen: boolean) {
    const pending = pendingInsert.current;
    const textarea = textareaRef.current;
    if (isOpen || !pending || !textarea) return;
    pendingInsert.current = null;

    if (pending.range) {
      textarea.setSelectionRange(pending.range.start, pending.range.end);
      replaceSelection(textarea, pending.text);
    } else {
      insertBlock(textarea, pending.text);
    }
  }

  const builder = editing && QUIZ_BUILDERS[editing.draft.kind];

  return (
    <>
      <ToolbarButton label={t.button} icon={ListChecks} onClick={open} />

      <Dialog
        open={editing !== null}
        onOpenChange={(isOpen) => !isOpen && setEditing(null)}
        onOpenChangeComplete={applyPendingInsert}
      >
        <DialogContent finalFocus={textareaRef} className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.range ? t.editTitle : t.insertTitle}</DialogTitle>
            <DialogDescription>{t.description}</DialogDescription>
          </DialogHeader>

          {editing && builder && (
            <form className="flex flex-col gap-4" onSubmit={submit}>
              {!editing.range && (
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t.kindLabel}>
                  {KINDS.map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      role="radio"
                      aria-checked={editing.draft.kind === kind}
                      onClick={() => setEditing({ ...editing, draft: QUIZ_BUILDERS[kind].empty() })}
                      className={cn(
                        "flex flex-col items-start rounded-md border px-3 py-2 text-left text-sm",
                        editing.draft.kind === kind ? "border-primary bg-primary/10" : "border-input hover:bg-muted",
                      )}
                    >
                      <span className="font-medium">{t.kinds[kind].label}</span>
                      <span className="text-xs text-muted-foreground">{t.kinds[kind].description}</span>
                    </button>
                  ))}
                </div>
              )}

              <builder.Form
                idPrefix={`quiz-${editing.id}`}
                draft={editing.draft}
                onChange={(draft) => {
                  setEditing({ ...editing, draft });
                  setError(null);
                }}
              />

              {error && <p className="text-sm text-destructive">{error}</p>}

              <DialogFooter>
                <DialogClose render={<Button type="button" variant="outline" />}>
                  {dictionary.common.cancel}
                </DialogClose>
                <Button type="submit">{editing.range ? t.update : t.insert}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
