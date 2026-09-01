"use client";

import Link from "next/link";
import { Zap } from "lucide-react";
import { useSession } from "next-auth/react";

export function SiteLogo() {
  const { data: session } = useSession();

  const content = (
    <>
      <Zap className="size-5 text-primary" />
      GeekPower
    </>
  );

  if (!session?.user) {
    return (
      <span className="flex items-center gap-2 font-semibold tracking-tight">
        {content}
      </span>
    );
  }

  return (
    <Link href="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
      {content}
    </Link>
  );
}
