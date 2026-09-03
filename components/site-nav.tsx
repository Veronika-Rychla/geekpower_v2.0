"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

export function useNavLinks() {
  const { data: session } = useSession();

  if (!session?.user) {
    return null;
  }

  return [
    { href: "/lessons", label: "Lessons" },
    ...(session.user.role === "Admin" ? [{ href: "/students", label: "Students" }] : []),
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
        <Link key={link.href} href={link.href} className="transition-colors hover:text-foreground">
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
