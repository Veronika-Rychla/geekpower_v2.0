import { getCachedPublishedBlogPosts } from "@/lib/blog";
import {
  publicJson,
  publicPreflight,
  rejectIfRateLimited,
} from "@/lib/public-api";

/**
 * GET /api/blog/{guid}
 * One published post including its full message. Public, no authentication.
 */
export async function GET(
  request: Request,
  { params }: RouteContext<"/api/blog/[guid]">,
) {
  const limited = rejectIfRateLimited(request);
  if (limited) return limited;

  const { guid } = await params;
  // Looked up in the cached list, so unknown guids never reach the DB
  const post = (await getCachedPublishedBlogPosts()).find(
    (p) => p.guid === guid,
  );
  if (!post) {
    return publicJson(request, { error: "Not found" }, 404);
  }

  const {
    title,
    summary,
    message,
    type,
    readTime,
    authorName,
    createdAt,
    updatedAt,
  } = post;
  return publicJson(request, {
    guid,
    title,
    summary,
    message,
    type,
    readTime,
    authorName,
    createdAt,
    updatedAt,
  });
}

export function OPTIONS(request: Request) {
  return publicPreflight(request);
}
