"use client";

import { createContext, use } from "react";

import type { Dictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/i18n";

const I18nContext = createContext<{
  locale: Locale;
  dictionary: Dictionary;
} | null>(null);

/** Hands the request's locale and translations (from the root layout) to client components. */
export function I18nProvider({
  locale,
  dictionary,
  children,
}: {
  locale: Locale;
  dictionary: Dictionary;
  children: React.ReactNode;
}) {
  return <I18nContext value={{ locale, dictionary }}>{children}</I18nContext>;
}

function useI18n() {
  const value = use(I18nContext);
  if (!value) throw new Error("I18nProvider is missing");
  return value;
}

/** Translations for the current locale, in client components. */
export function useDictionary(): Dictionary {
  return useI18n().dictionary;
}

export function useLocale(): Locale {
  return useI18n().locale;
}
