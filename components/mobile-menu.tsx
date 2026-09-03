"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { LogOut, Menu, X } from "lucide-react";

import { useNavLinks } from "@/components/site-nav";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const links = useNavLinks();

  if (!links) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-muted-foreground transition-colors hover:text-foreground sm:hidden"
        aria-label="Toggle navigation menu"
        aria-expanded={open}
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full border-b border-border bg-popover shadow-lg sm:hidden">
          <nav className="mx-auto flex w-full max-w-5xl flex-col gap-1 px-6 py-4 text-sm text-muted-foreground">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-2 transition-colors hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="mt-3 flex items-center gap-2 border-t border-border px-2 pt-4 text-left text-xs text-destructive/80 transition-colors hover:text-destructive"
            >
              <LogOut className="size-3.5" />
              Log out
            </button>
          </nav>
        </div>
      )}
    </>
  );
}
