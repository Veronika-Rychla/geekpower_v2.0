const READING_WORDS_PER_MINUTE = 200;

/** Rough plain text of a Markdown post: keeps words people read, drops URLs and syntax. */
export function markdownToPlainText(markdown: string): string {
  return (
    markdown
      // Fences of code blocks (the code itself still counts)
      .replace(/^\s*(```|~~~).*$/gm, " ")
      // Images → alt text, links → link text
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      // Bare URLs (incl. YouTube embeds)
      .replace(/\b(?:https?:\/\/|www\.)\S+/g, " ")
      // Callout markers, headings, quotes, list bullets, table pipes
      .replace(/\[![\w]+\][-+]?/g, " ")
      .replace(/^\s*(?:#{1,6}|>+|[-*+]|\d+\.)\s+/gm, "")
      .replace(/[|*_~`=]+/g, " ")
  );
}

/** Estimated reading time of a Markdown post in whole minutes (at least 1). */
export function estimateReadTime(markdown: string): number {
  const words = markdownToPlainText(markdown)
    .split(/\s+/)
    .filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
  return Math.max(1, Math.ceil(words / READING_WORDS_PER_MINUTE));
}
