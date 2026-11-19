/*
 * Text edits for the Markdown textarea. They go through `insertText` so each
 * one is a single native undo step (Ctrl+Z) and fires a normal input event
 * that react-hook-form picks up.
 */

/**
 * Replaces the current selection with `text`, then selects `[from, to)`
 * relative to the start of the inserted text (or puts the caret after it).
 */
export function replaceSelection(
  textarea: HTMLTextAreaElement,
  text: string,
  select?: [from: number, to: number],
) {
  const start = textarea.selectionStart;
  textarea.focus();
  // execCommand is deprecated but still the only way to keep the undo stack
  const inserted = document.execCommand("insertText", false, text);
  if (!inserted) {
    textarea.setRangeText(text, start, textarea.selectionEnd, "end");
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }
  if (select) {
    textarea.setSelectionRange(start + select[0], start + select[1]);
  }
}

/** `**bold**`-style wrapping; with nothing selected, inserts and selects `placeholder`. */
export function wrapSelection(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string,
  placeholder: string,
) {
  const { value, selectionStart, selectionEnd } = textarea;
  const inner = value.slice(selectionStart, selectionEnd) || placeholder;
  replaceSelection(textarea, before + inner + after, [
    before.length,
    before.length + inner.length,
  ]);
}

/**
 * Prefixes every line touched by the selection (`## `, `> `, `- `). A `"1. "`
 * prefix numbers the lines. Applying the same prefix again removes it.
 */
export function prefixLines(textarea: HTMLTextAreaElement, prefix: string) {
  const { value, selectionStart, selectionEnd } = textarea;
  const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
  const nextBreak = value.indexOf("\n", selectionEnd);
  const lineEnd = nextBreak === -1 ? value.length : nextBreak;

  const lines = value.slice(lineStart, lineEnd).split("\n");
  const numbered = prefix === "1. ";
  const pattern = numbered ? /^\d+\. / : null;
  const hasPrefix = (line: string) =>
    pattern ? pattern.test(line) : line.startsWith(prefix);
  const removing = lines.every(hasPrefix);

  const result = lines
    .map((line, i) => {
      if (removing) {
        return pattern ? line.replace(pattern, "") : line.slice(prefix.length);
      }
      return (numbered ? `${i + 1}. ` : prefix) + line;
    })
    .join("\n");

  textarea.setSelectionRange(lineStart, lineEnd);
  replaceSelection(textarea, result, [0, result.length]);
}

/**
 * Inserts `block` as its own paragraph (blank line before and after), which
 * images and YouTube embeds need. The caret ends up after the block.
 */
export function insertBlock(textarea: HTMLTextAreaElement, block: string) {
  const { value, selectionStart } = textarea;
  const textBefore = value.slice(0, selectionStart);
  const before =
    textBefore === "" || textBefore.endsWith("\n\n")
      ? ""
      : textBefore.endsWith("\n")
        ? "\n"
        : "\n\n";
  replaceSelection(textarea, `${before}${block}\n\n`);
}
