"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

import { MascotArt } from "@/components/mascot/mascot-art";

export function SiteLogo() {
  const { data: session } = useSession();

  const content = (
    <>
      <span className="block size-7">
        <MascotArt thin scenery={false} />
      </span>
      GeekPower
    </>
  );

  return (
    <span className="flex items-start">
      <Link
        href={!session?.user ? "/" : "/dashboard"}
        className="flex items-center gap-2 font-semibold tracking-tight"
      >
        {content}
      </Link>
    </span>
  );
}
