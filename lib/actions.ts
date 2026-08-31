"use server";

import { getUserByEmail } from "@/lib/data";

export async function loginWithEmail(email: string) {
  const user = await getUserByEmail(email);

  return user;
}
