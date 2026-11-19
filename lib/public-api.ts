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
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    // JSON POSTs send Content-Type: application/json, which the preflight must allow
    headers.set("Access-Control-Allow-Headers", "Content-Type");
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

/**
 * Returns a 429 response when the caller is over the rate limit, otherwise null.
 * Pass `check` to use a route-specific limiter instead of the shared one.
 */
export function rejectIfRateLimited(
  request: Request,
  check: ReturnType<typeof createRateLimiter> = checkRateLimit,
): Response | null {
  const { allowed, retryAfterSeconds } = check(getClientIp(request));
  if (allowed) {
    return null;
  }

  const response = publicJson(request, { error: "Too many requests" }, 429);
  response.headers.set("Retry-After", String(retryAfterSeconds));
  return response;
}
