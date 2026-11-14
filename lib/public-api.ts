import "server-only";

import { createRateLimiter, getClientIp } from "@/lib/rate-limit";

const checkRateLimit = createRateLimiter({ limit: 60, windowSeconds: 60 });

/** Origins allowed to call the public API from a browser, from a comma-separated env var. */
const ALLOWED_ORIGINS = new Set(
  (process.env.PUBLIC_API_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean),
);

/** Browsers and the CDN may reuse a response for 1 min, then serve it stale for up to 10 min while refetching. */
const CACHEABLE = "public, max-age=60, s-maxage=60, stale-while-revalidate=600";

function baseHeaders(request: Request, cacheControl: string): Headers {
  const headers = new Headers({
    "Cache-Control": cacheControl,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    Vary: "Origin",
  });

  const origin = request.headers.get("origin");
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    headers.set("Access-Control-Max-Age", "86400");
  }

  return headers;
}

/** JSON response with CORS and security headers. Errors are never cached. */
export function publicJson(
  request: Request,
  body: unknown,
  status = 200,
): Response {
  return Response.json(body, {
    status,
    headers: baseHeaders(request, status === 200 ? CACHEABLE : "no-store"),
  });
}

/** Answers a CORS preflight. */
export function publicPreflight(request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: baseHeaders(request, "no-store"),
  });
}

/** Returns a 429 response when the caller is over the rate limit, otherwise null. */
export function rejectIfRateLimited(request: Request): Response | null {
  const { allowed, retryAfterSeconds } = checkRateLimit(getClientIp(request));
  if (allowed) {
    return null;
  }

  const response = publicJson(request, { error: "Too many requests" }, 429);
  response.headers.set("Retry-After", String(retryAfterSeconds));
  return response;
}
