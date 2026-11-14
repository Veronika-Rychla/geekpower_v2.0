import { unstable_cache } from "next/cache";
import { DateTime } from "luxon";
import { z } from "zod";

import { sql } from "@/app/database";
import type { BlogMessage, BlogPostType } from "@/lib/types";

const BLOG_POSTS_LIMIT = 100;

function toBlogMessage(row: Record<string, unknown>): BlogMessage {
  return {
    guid: row.guid as string,
    title: row.title as string,
    summary: row.summary as string,
    message: row.message as string,
    type: row.type as BlogPostType[],
    isDraft: row.is_draft as boolean,
    readTime: row.read_time as number,
    authorName: `${row.first_name} ${row.last_name}`.trim(),
    // Neon returns timestamptz columns as JS Dates
    createdAt: DateTime.fromJSDate(row.created_at as Date).toISO()!,
    updatedAt: row.updated_at
      ? DateTime.fromJSDate(row.updated_at as Date).toISO()
      : null,
  };
}

/** Newest first, with the author's current name joined from users. Drafts only when `includeDrafts`. */
export async function getBlogPosts({
  includeDrafts,
}: {
  includeDrafts: boolean;
}): Promise<BlogMessage[]> {
  const rows = await sql`
    SELECT b.guid, b.title, b.summary, b.message, b.type, b.is_draft, b.read_time,
           b.created_at, b.updated_at, u.first_name, u.last_name
    FROM blog_posts b
    JOIN users u ON u.guid = b.author_guid
    WHERE ${includeDrafts} OR NOT b.is_draft
    ORDER BY b.created_at DESC
    LIMIT ${BLOG_POSTS_LIMIT}
  `;

  return rows.map(toBlogMessage);
}

export const BLOG_POSTS_CACHE_TAG = "blog-posts";

/**
 * Published posts from Next's data cache, for the public API. Every API request reads this one
 * entry, so no query string or made-up guid can force a DB query. Blog actions invalidate the
 * tag, and the timed revalidate is a safety net.
 */
export const getCachedPublishedBlogPosts = unstable_cache(
  () => getBlogPosts({ includeDrafts: false }),
  ["published-blog-posts"],
  { tags: [BLOG_POSTS_CACHE_TAG], revalidate: 300 },
);

/** One post, or null if it doesn't exist (or is a draft and `includeDrafts` is false). */
export async function getBlogPost(
  guid: string,
  { includeDrafts }: { includeDrafts: boolean },
): Promise<BlogMessage | null> {
  // The guid comes from the URL; a malformed one would make Postgres throw on the uuid cast
  if (!z.uuid().safeParse(guid).success) {
    return null;
  }

  const [row] = await sql`
    SELECT b.guid, b.title, b.summary, b.message, b.type, b.is_draft, b.read_time,
           b.created_at, b.updated_at, u.first_name, u.last_name
    FROM blog_posts b
    JOIN users u ON u.guid = b.author_guid
    WHERE b.guid = ${guid} AND (${includeDrafts} OR NOT b.is_draft)
  `;

  return row ? toBlogMessage(row) : null;
}
