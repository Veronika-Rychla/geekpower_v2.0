"use client";

import { useSession } from "next-auth/react";

export function UserGreeting() {
  const { data: session } = useSession();
  const user = session?.user;

  if (!user) {
    return null;
  }

  return <span className="text-sm text-muted-foreground">Hello {user.name}</span>;
}
