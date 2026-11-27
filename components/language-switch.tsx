"use client";

import { useTransition } from "react";
import { ChevronDown, Languages } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDictionary, useLocale } from "@/components/i18n-provider";
import { saveLocale } from "@/lib/actions";
import { hasLocale, localeCookie, locales, type Locale } from "@/lib/i18n";
import { writeSharedCookie } from "@/lib/shared-cookie";

/*
 * The language switch, the same choice as on the public website: the pick goes
 * into the shared `lang` cookie (so it applies on both sites) and, when signed
 * in, into users.locale. The page then re-renders in the new language.
 */

function useLocaleSwitch() {
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  function change(next: unknown) {
    if (!hasLocale(next) || next === locale) return;
    writeSharedCookie(localeCookie, next);
    startTransition(() => saveLocale(next));
  }

  return { locale, change, isPending };
}

/** A small flag, the same artwork as the website's language switch. */
export function LocaleFlag({ locale }: { locale: Locale }) {
  return (
    <span
      aria-hidden
      className="flex h-3.5 w-5 shrink-0 overflow-hidden rounded-[2px] outline outline-border"
    >
      {locale === "cs" ? (
        <svg viewBox="0 0 6 4" className="size-full">
          <rect width="6" height="2" fill="#fff" />
          <rect y="2" width="6" height="2" fill="#d7141a" />
          <polygon points="0,0 3,2 0,4" fill="#11457e" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 60 30"
          preserveAspectRatio="none"
          className="size-full"
        >
          <rect width="60" height="30" fill="#012169" />
          <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth={6} />
          <path d="M0,0 L60,30 M60,0 L0,30" stroke="#c8102e" strokeWidth={2} />
          <path d="M30,0 V30 M0,15 H60" stroke="#fff" strokeWidth={10} />
          <path d="M30,0 V30 M0,15 H60" stroke="#c8102e" strokeWidth={6} />
        </svg>
      )}
    </span>
  );
}

function LocaleOptions({
  locale,
  disabled,
  onChange,
}: {
  locale: Locale;
  disabled: boolean;
  onChange: (next: unknown) => void;
}) {
  const t = useDictionary().language;

  return (
    <DropdownMenuRadioGroup value={locale} onValueChange={onChange}>
      {locales.map((option) => (
        <DropdownMenuRadioItem
          key={option}
          value={option}
          disabled={disabled}
          closeOnClick
        >
          <LocaleFlag locale={option} />
          {t.names[option]}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  );
}

/** "Language" submenu for the user menu. */
export function LanguageSubmenu() {
  const t = useDictionary();
  const { locale, change, isPending } = useLocaleSwitch();

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Languages />
        <span className="flex-1">{t.userMenu.language}</span>
        <span className="text-xs text-muted-foreground">
          {t.language.codes[locale]}
        </span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-40">
        <LocaleOptions locale={locale} disabled={isPending} onChange={change} />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

/** A standalone language button, for when there's no user menu (signed out). */
export function LanguageButton() {
  const t = useDictionary().language;
  const { locale, change, isPending } = useLocaleSwitch();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            aria-label={t.label}
          />
        }
      >
        <LocaleFlag locale={locale} />
        <span>{t.codes[locale]}</span>
        <ChevronDown />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-40">
        <LocaleOptions locale={locale} disabled={isPending} onChange={change} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
