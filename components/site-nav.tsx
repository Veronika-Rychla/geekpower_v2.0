"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { hasTeacherAccess } from "@/lib/utils";
import { useDictionary } from "@/components/i18n-provider";

export function useNavLinks() {
  const { data: session } = useSession();
  const t = useDictionary().nav;

  if (!session?.user) {
    return null;
  }

  return [
    { href: "/lessons", label: t.lessons },
    ...(hasTeacherAccess(session.user.role)
      ? [{ href: "/students", label: t.students }]
      : []),
    { href: "/practice", label: t.practice },
    { href: "/dictionary", label: t.dictionary },
    { href: "/extra", label: t.extra },
    { href: "/blog", label: t.blog },
  ];
}

export function SiteNav() {
  const links = useNavLinks();

  if (!links) {
    return null;
  }

  return (
    <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="transition-colors hover:text-foreground"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
