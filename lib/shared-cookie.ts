// Cookies shared with the public website (geekpower_website/lib/shared-cookie.ts,
// keep the two in sync). They live on the parent domain, so geekpower.cz and
// app.geekpower.cz both read the same value: the color theme and the language.
// Browser only.

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * The domain both sites share (geekpower.cz for app.geekpower.cz), or null on
 * localhost and IPs, where a host-only cookie is already shared across ports.
 */
function sharedDomain(): string | null {
  const host = location.hostname;
  if (!host.includes(".") || /^[\d.]+$/.test(host) || host.includes(":"))
    return null;
  return host.split(".").slice(-2).join(".");
}

/** The cookie's value in this browser, or null. */
export function readCookie(name: string): string | null {
  const prefix = `${name}=`;
  const found = document.cookie
    .split(/;\s*/)
    .find((part) => part.startsWith(prefix));
  return found ? decodeURIComponent(found.slice(prefix.length)) : null;
}

/** Saves `value` on the shared domain; null deletes the cookie. */
export function writeSharedCookie(
  name: string,
  value: string | null,
  maxAge = ONE_YEAR,
) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  const cookie = `${name}=${value ?? ""}; Path=/; Max-Age=${value ? maxAge : 0}; SameSite=Lax${secure}`;
  // Drop any host-only copy, so it can't shadow the shared one.
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
  const domain = sharedDomain();
  if (domain) document.cookie = `${cookie}; Domain=${domain}`;
  // The browser refuses a public suffix (e.g. a *.netlify.app preview): keep it host-only there.
  if (value && readCookie(name) !== value) document.cookie = cookie;
}
