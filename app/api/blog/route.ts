import { z } from "zod";

import { getCachedPublishedBlogPosts } from "@/lib/blog";
import {
  publicJson,
  publicPreflight,
  rejectIfRateLimited,
} from "@/lib/public-api";
import { BLOG_POST_TYPES, type BlogMessage } from "@/lib/types";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
  type: z.enum(BLOG_POST_TYPES).optional(),
});

/** List view: everything public except the full message (fetch /api/blog/{guid} for that). */
function toListItem({
  guid,
  title,
  summary,
  type,
  readTime,
  authorName,
  createdAt,
  updatedAt,
}: BlogMessage) {
  return {
    guid,
    title,
    summary,
    type,
    readTime,
    authorName,
    createdAt,
    updatedAt,
  };
}

/**
 * GET /api/blog?limit=20&offset=0&type=Career
 * Published posts, newest first. Public, no authentication.
 */
export async function GET(request: Request) {
  const limited = rejectIfRateLimited(request);
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const query = querySchema.safeParse({
    limit: searchParams.get("limit") ?? undefined,
    offset: searchParams.get("offset") ?? undefined,
    type: searchParams.get("type") ?? undefined,
  });
  if (!query.success) {
    return publicJson(request, { error: "Invalid query parameters" }, 400);
  }

  const { limit, offset, type } = query.data;
  const posts = await getCachedPublishedBlogPosts();
  const matching = type
    ? posts.filter((post) => post.type.includes(type))
    : posts;

  return publicJson(request, {
    posts: matching.slice(offset, offset + limit).map(toListItem),
    total: matching.length,
    limit,
    offset,
  });
}

export function OPTIONS(request: Request) {
  return publicPreflight(request);
}
