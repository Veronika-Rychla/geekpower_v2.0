// Locale config shared by server and client code. The language picked in the
// user menu is kept in the `lang` cookie on the parent domain, shared with the
// public website (geekpower_website/lib/i18n.ts uses the same cookie and
// locales), and for signed-in users also in `users.locale`.
// Translations live in messages/<locale>.json; read them with getDictionary()
// (lib/dictionary.ts) on the server or useDictionary() in client components.

export const locales = ["cs", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "cs";

/** Cookie with the picked locale, shared with the website. */
export const localeCookie = "lang";

export const hasLocale = (value: unknown): value is Locale =>
  (locales as readonly unknown[]).includes(value);

/** BCP 47 tags for Intl formatting, the same as on the website. */
export const localeTags: Record<Locale, string> = { cs: "cs-CZ", en: "en-GB" };

/** Fills `{name}` placeholders: `fill("Hi {name}", { name: "Eva" })` → "Hi Eva". */
export function fill(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
