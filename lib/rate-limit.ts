import "server-only";

/** Upper bound on tracked clients, so a flood of spoofed IPs can't grow memory without limit. */
const MAX_TRACKED_CLIENTS = 10_000;

/**
 * Fixed-window rate limiter kept in memory.
 *
 * Best effort only: on serverless hosting each instance has its own counters,
 * and they reset on cold starts. It stops one client hammering one instance,
 * not a distributed attack (that needs the host's firewall or a shared store).
 */
export function createRateLimiter({
  limit,
  windowSeconds,
}: {
  limit: number;
  windowSeconds: number;
}) {
  const windows = new Map<string, { count: number; resetAt: number }>();

  return function check(key: string): {
    allowed: boolean;
    retryAfterSeconds: number;
  } {
    const now = Date.now();
    let entry = windows.get(key);

    if (!entry || entry.resetAt <= now) {
      if (windows.size >= MAX_TRACKED_CLIENTS) {
        for (const [k, v] of windows) if (v.resetAt <= now) windows.delete(k);
        // Still full: drop the oldest entry (Maps iterate in insertion order)
        if (windows.size >= MAX_TRACKED_CLIENTS)
          windows.delete(windows.keys().next().value!);
      }
      entry = { count: 0, resetAt: now + windowSeconds * 1000 };
      windows.set(key, entry);
    }

    entry.count++;
    return {
      allowed: entry.count <= limit,
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
    };
  };
}

/** The caller's IP as reported by the host (Netlify sets x-nf-client-connection-ip). */
export function getClientIp(request: Request): string {
  return clientIpFromHeaders(request.headers);
}

/** Same as getClientIp, for server actions (pass `await headers()`). */
export function clientIpFromHeaders(headers: Headers): string {
  return (
    headers.get("x-nf-client-connection-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  );
}
