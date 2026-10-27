import "server-only";

import { cache } from "react";

import { auth } from "@/auth";
import type { Role } from "@/lib/types";
import { hasTeacherAccess } from "@/lib/utils";

export interface CurrentUser {
  guid: string;
  role: Role;
}

/**
 * The signed-in user, or null. Cached per request, so the same object is
 * returned to every caller (which also lets `cache()`-wrapped helpers that
 * take it as an argument hit their cache).
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const guid = session?.user?.guid;
  const role = session?.user?.role;

  return guid && role ? { guid, role } : null;
});

/** For server actions: throws unless someone is signed in. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated");
  }
  return user;
}

/** For server actions: throws unless the signed-in user is a Teacher or Admin. */
export async function requireTeacher(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!hasTeacherAccess(user.role)) {
    throw new Error("Not authorized");
  }
  return user;
}
