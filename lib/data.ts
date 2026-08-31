import { sql } from "@/app/database";
import { User } from "./types";

export async function getUsers() {
  const users = await sql`SELECT * FROM users`;

  return users as User[];
}

export async function getUserByEmail(email: string) {
  const [user] = await sql`SELECT * FROM users WHERE email = ${email}`;

  return (user as User) ?? null;
}
