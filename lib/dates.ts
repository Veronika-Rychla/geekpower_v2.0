/**
 * Date helpers. After the DB layer, dates travel through the app as ISO 8601 strings
 * (serializable across the server/client boundary). Format and compare them only here.
 *
 * Formatting takes the UI locale (lib/i18n.ts) and pins the time zone, so server and
 * client render identical text (no hydration mismatch, no UTC times on the server).
 */

import { localeTags, type Locale } from "@/lib/i18n";

const TIME_ZONE = "Europe/Prague";

function makeFormatters(tag: string) {
  return {
    dateTime: new Intl.DateTimeFormat(tag, {
      timeZone: TIME_ZONE,
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
    date: new Intl.DateTimeFormat(tag, {
      timeZone: TIME_ZONE,
      day: "numeric",
      month: "numeric",
      year: "numeric",
    }),
  };
}

const formatters: Record<Locale, ReturnType<typeof makeFormatters>> = {
  cs: makeFormatters(localeTags.cs),
  en: makeFormatters(localeTags.en),
};

const yearFormatter = new Intl.DateTimeFormat("en", {
  timeZone: TIME_ZONE,
  year: "numeric",
});

// --- Conversion (DB boundary) ---

/** Neon returns `timestamptz` columns as JS Dates; returns null for anything else (e.g. NULL). */
export function toIsoOrNull(value: unknown): string | null {
  return value instanceof Date ? value.toISOString() : null;
}

/** For NOT NULL `timestamptz` columns. Throws if the value isn't a Date. */
export function toIso(value: unknown): string {
  const iso = toIsoOrNull(value);
  if (iso === null) {
    throw new Error(`Expected a Date, got ${String(value)}`);
  }
  return iso;
}

// --- Formatting ---

/** e.g. "15. 11. 2026 14:30" in Czech, "15 Nov 2026, 14:30" in English; Prague time. */
export function formatDateTime(iso: string, locale: Locale): string {
  return formatters[locale].dateTime.format(new Date(iso));
}

/** Date only, e.g. "15. 11. 2026" or "15/11/2026". */
export function formatDate(iso: string, locale: Locale): string {
  return formatters[locale].date.format(new Date(iso));
}

/** Current year in Prague time. */
export function currentYear(): string {
  return yearFormatter.format(new Date());
}

// --- Comparison ---

/** Current moment as an ISO string. */
export function nowIso(): string {
  return new Date().toISOString();
}

/** True if `a` is strictly before `b`. */
export function isBefore(a: string, b: string): boolean {
  return Date.parse(a) < Date.parse(b);
}

/** True if `iso` is in the past. */
export function isPast(iso: string): boolean {
  return Date.parse(iso) < Date.now();
}
