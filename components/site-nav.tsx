"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { hasTeacherAccess } from "@/lib/utils";

export function useNavLinks() {
  const { data: session } = useSession();

  if (!session?.user) {
    return null;
  }

  return [
    { href: "/lessons", label: "Lessons" },
    ...(hasTeacherAccess(session.user.role)
      ? [{ href: "/students", label: "Students" }]
      : []),
    { href: "/practice", label: "Practice" },
    { href: "/dictionary", label: "Dictionary" },
    { href: "/extra", label: "Extra" },
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
