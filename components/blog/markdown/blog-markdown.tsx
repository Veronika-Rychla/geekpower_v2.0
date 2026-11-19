import Markdown, { type Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkFlexibleMarkers from "remark-flexible-markers";
import remarkGfm from "remark-gfm";

import { remarkCallouts } from "@/lib/mdx/remark-callouts";
import { remarkYoutube } from "@/components/blog/markdown/remark-youtube";

/*
 * Shared blog renderer: this folder, lib/mdx/remark-callouts.ts and
 * app/markdown.css are what the public website copies. No "use client", so it
 * renders in server and client components alike. Raw HTML in the Markdown is
 * ignored and unsafe URLs (javascript: etc.) are dropped by react-markdown.
 */

const remarkPlugins = [
  remarkGfm,
  remarkFlexibleMarkers,
  // Before remarkBreaks: it reads the `[!info] Title` line up to its newline
  remarkCallouts,
  // A single Enter is a line break, like the old plain-text posts
  remarkBreaks,
  remarkYoutube,
];

const components: Components = {
  a({ node, href, ...props }) {
    void node;
    const isExternal = !!href && /^https?:\/\//.test(href);
    return (
      <a
        href={href}
        {...(isExternal && { target: "_blank", rel: "noopener noreferrer" })}
        {...props}
      />
    );
  },
  img({ node, src, alt, ...props }) {
    void node;
    // Placeholder while an image is uploading in the editor: `![Nahrávám…]()`
    if (!src) {
      return <span className="text-muted-foreground italic">{alt}</span>;
    }
    // Plain <img> (not next/image) so the renderer works on any site without config
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt ?? ""}
        loading="lazy"
        decoding="async"
        {...props}
      />
    );
  },
};

interface BlogMarkdownProps {
  content: string;
}

export function BlogMarkdown({ content }: BlogMarkdownProps) {
  return (
    <Markdown remarkPlugins={remarkPlugins} components={components}>
      {content}
    </Markdown>
  );
}
