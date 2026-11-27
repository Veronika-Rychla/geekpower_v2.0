import "server-only";

import { sql } from "@/app/database";
import { User } from "./types";

export async function getUsers() {
  const users = await sql`SELECT * FROM users`;

  return users as User[];
}

/** Case-insensitive, so "Jan@Example.com" finds the account stored as "jan@example.com". */
export async function getUserByEmail(email: string) {
  const [user] =
    await sql`SELECT * FROM users WHERE lower(email) = lower(${email.trim()})`;

  return (user as User) ?? null;
}
