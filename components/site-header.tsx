import Link from "next/link";
import { Zap } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Zap className="size-5 text-primary" />
          GeekPower
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
          <Link href="#" className="transition-colors hover:text-foreground">
            Product
          </Link>
          <Link href="#" className="transition-colors hover:text-foreground">
            Docs
          </Link>
          <Link href="#" className="transition-colors hover:text-foreground">
            Pricing
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            Sign up
          </Button>
          <Button size="sm">Log in</Button>
        </div>
      </div>
    </header>
  );
}
