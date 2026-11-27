"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";

import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/components/i18n-provider";
import type { Dictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/i18n";

export function Providers({
  children,
  session,
  locale,
  dictionary,
}: {
  children: React.ReactNode;
  session: Session | null;
  locale: Locale;
  dictionary: Dictionary;
}) {
  return (
    <SessionProvider session={session}>
      <I18nProvider locale={locale} dictionary={dictionary}>
        <TooltipProvider>{children}</TooltipProvider>
      </I18nProvider>
    </SessionProvider>
  );
}
