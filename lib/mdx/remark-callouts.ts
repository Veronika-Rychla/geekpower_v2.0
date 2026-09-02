import { visit } from "unist-util-visit";
import type { Blockquote, Paragraph, PhrasingContent, Root } from "mdast";

// No `$`/multiline anchor: a callout's blockquote is often more than one
// line (the marker line plus body text), all inside a single text node
// joined by "\n" — matching to end-of-string would fail on anything past
// the first line.
const MARKER = /^\[!(\w+)\]([-+]?)[ \t]*([^\n]*)/;

/**
 * Transforms Obsidian-style callouts (`> [!info]- Title`) into a styled
 * `<div>` so react-markdown/MDX renders them instead of a plain blockquote
 * with the raw marker text visible.
 */
export function remarkCallouts() {
  return (tree: Root) => {
    visit(tree, "blockquote", (node: Blockquote) => {
      const first = node.children[0];
      if (!first || first.type !== "paragraph") return;

      const firstInline = first.children[0];
      if (!firstInline || firstInline.type !== "text") return;

      const match = firstInline.value.match(MARKER);
      if (!match) return;

      const [fullMatch, type, fold, rawTitle] = match;
      const title = rawTitle.trim();
      const remainder = firstInline.value.slice(fullMatch.length).trimStart();

      if (remainder) {
        firstInline.value = remainder;
      } else {
        (first.children as PhrasingContent[]).shift();
        if (first.children.length === 0) {
          node.children.shift();
        }
      }

      if (title) {
        const titleParagraph: Paragraph = {
          type: "paragraph",
          data: { hName: "p", hProperties: { className: ["callout-title"] } },
          children: [{ type: "text", value: title }],
        };
        node.children.unshift(titleParagraph);
      }

      node.data = {
        hName: "div",
        hProperties: {
          className: ["callout", `callout-${type.toLowerCase()}`],
          "data-collapsed": fold === "-" ? "true" : undefined,
        },
      };
    });
  };
}
