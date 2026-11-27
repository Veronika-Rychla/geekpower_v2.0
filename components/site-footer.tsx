import Link from "next/link";

import { currentYear } from "@/lib/dates";
import { getDictionary } from "@/lib/dictionary";

export async function SiteFooter() {
  const t = (await getDictionary()).footer;

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
        <p>
          © {currentYear()} GeekPower. {t.rights}
        </p>
        <div className="flex items-center gap-6">
          <Link href="#" className="transition-colors hover:text-foreground">
            {t.privacy}
          </Link>
          <Link href="#" className="transition-colors hover:text-foreground">
            {t.terms}
          </Link>
          <Link href="#" className="transition-colors hover:text-foreground">
            {t.contact}
          </Link>
        </div>
      </div>
    </footer>
  );
}
