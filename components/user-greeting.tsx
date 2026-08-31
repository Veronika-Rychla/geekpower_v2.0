"use client";

import { useUserStore } from "@/lib/store";

export function UserGreeting() {
  const user = useUserStore((state) => state.user);

  if (!user) {
    return null;
  }

  return <span className="text-sm text-muted-foreground">Hello {user.name}</span>;
}
