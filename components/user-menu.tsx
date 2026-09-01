"use client";

import { useSession } from "next-auth/react";

import { LogoutButton } from "@/components/logout-button";
import { UserGreeting } from "@/components/user-greeting";

export function UserMenu() {
  const { data: session } = useSession();

  if (!session?.user) {
    return null;
  }

  return (
    <div className="flex items-center gap-4">
      <UserGreeting name={session.user.name} />
      <LogoutButton />
    </div>
  );
}
