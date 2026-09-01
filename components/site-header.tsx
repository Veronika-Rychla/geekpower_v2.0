import Link from "next/link";
import { Zap } from "lucide-react";

import { LogoutButton } from "@/components/logout-button";
import { SiteNav } from "@/components/site-nav";
import { UserGreeting } from "@/components/user-greeting";

export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <Zap className="size-5 text-primary" />
          GeekPower
        </Link>
        <SiteNav />
        <div className="flex items-center gap-4">
          <UserGreeting />
          <div className="flex items-center gap-2">
            <LogoutButton />
          </div>
        </div>
      </div>
    </header>
  );
}
