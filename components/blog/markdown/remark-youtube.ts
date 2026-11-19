import { visit } from "unist-util-visit";
import type { Paragraph, Root } from "mdast";

const VIDEO_ID = /^[\w-]{11}$/;
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
]);

export interface YoutubeVideo {
  id: string;
  /** Start offset in seconds, from a `t=` / `start=` parameter. */
  start?: number;
}

/** "90", "90s", "1m30s", "1h2m3s" → seconds; anything else → undefined. */
function parseStart(value: string | null): number | undefined {
  if (!value) return undefined;
  if (/^\d+$/.test(value)) return Number(value);
  const match = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!match || !match[0]) return undefined;
  const [, h = "0", m = "0", s = "0"] = match;
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

/**
 * Parses a YouTube watch / share / shorts / embed / live URL. Returns null for
 * anything else, including URLs whose video id doesn't look valid.
 */
export function parseYoutubeUrl(input: string): YoutubeVideo | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  let id: string | null = null;
  if (url.hostname === "youtu.be") {
    id = url.pathname.slice(1);
  } else if (YOUTUBE_HOSTS.has(url.hostname)) {
    if (url.pathname === "/watch") {
      id = url.searchParams.get("v");
    } else {
      const match = url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/);
      id = match?.[1] ?? null;
    }
  }

  if (!id || !VIDEO_ID.test(id)) return null;
  const start = parseStart(
    url.searchParams.get("t") ?? url.searchParams.get("start"),
  );
  return start ? { id, start } : { id };
}

export function youtubeEmbedUrl({ id, start }: YoutubeVideo): string {
  const query = start ? `?start=${start}` : "";
  return `https://www.youtube-nocookie.com/embed/${id}${query}`;
}

/**
 * Turns a paragraph that holds nothing but a bare YouTube URL into a
 * responsive embed. A link with its own text (`[watch](https://youtu.be/…)`)
 * stays a normal link, as does a URL inside a sentence. Needs remark-gfm, which
 * autolinks bare URLs.
 */
export function remarkYoutube() {
  return (tree: Root) => {
    visit(tree, "paragraph", (node: Paragraph) => {
      // Trailing whitespace / soft breaks around the URL are fine
      const children = node.children.filter(
        (child) =>
          !(child.type === "text" && child.value.trim() === "") &&
          child.type !== "break",
      );
      if (children.length !== 1) return;

      const [link] = children;
      if (link.type !== "link" || link.children.length !== 1) return;
      const [label] = link.children;
      if (label.type !== "text") return;
      // gfm autolinks `www.youtube.com/…` with an added `http://`
      const isBareUrl =
        label.value === link.url || `http://${label.value}` === link.url;
      if (!isBareUrl) return;

      const video = parseYoutubeUrl(link.url);
      if (!video) return;

      node.data = {
        hName: "div",
        hProperties: { className: ["video-embed"] },
        hChildren: [
          {
            type: "element",
            tagName: "iframe",
            properties: {
              src: youtubeEmbedUrl(video),
              title: "YouTube video",
              allow:
                "accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
              allowFullScreen: true,
              loading: "lazy",
              referrerPolicy: "strict-origin-when-cross-origin",
            },
            children: [],
          },
        ],
      };
    });
  };
}
