import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";

import { auth } from "@/auth";
import cs from "@/messages/cs.json";
import en from "@/messages/en.json";
import {
  defaultLocale,
  hasLocale,
  localeCookie,
  type Locale,
} from "@/lib/i18n";

export type Dictionary = typeof cs;

const dictionaries: Record<Locale, Dictionary> = { cs, en };

/**
 * The locale for this request: the language picked in this browser (here or
 * on the website), else the signed-in user's saved one (so a pick follows them
 * to a new device), else Czech.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const picked = (await cookies()).get(localeCookie)?.value;
  if (hasLocale(picked)) return picked;

  const saved = (await auth())?.user?.locale;
  return hasLocale(saved) ? saved : defaultLocale;
});

/** Translations for this request's locale. Server Components and server actions only. */
export async function getDictionary(): Promise<Dictionary> {
  return dictionaries[await getLocale()];
}

/** Translations for a given locale, e.g. an email in the recipient's language. */
export function dictionaryFor(locale: Locale): Dictionary {
  return dictionaries[locale];
}
