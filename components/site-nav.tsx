"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

export function SiteNav() {
  const { data: session } = useSession();

  if (!session?.user) {
    return null;
  }

  return (
    <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
      <Link href="#" className="transition-colors hover:text-foreground">
        Product
      </Link>
      <Link href="#" className="transition-colors hover:text-foreground">
        Docs
      </Link>
      <Link href="/lessons" className="transition-colors hover:text-foreground">
        Lessons
      </Link>
    </nav>
  );
}
