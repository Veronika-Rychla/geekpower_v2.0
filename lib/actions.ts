"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";

import { auth } from "@/auth";
import { sql } from "@/app/database";
import { getUserByEmail } from "@/lib/data";

const DEFAULT_PASSWORD = "password123";

export async function completeSublesson(lessonSlug: string, sublessonSlug: string) {
  const session = await auth();
  const userGuid = session?.user?.guid;

  if (!userGuid) {
    throw new Error("Not authenticated");
  }

  await sql`
    INSERT INTO progress.sublessons (user_guid, lesson_slug, sublesson_slug, completed_at)
    VALUES (${userGuid}, ${lessonSlug}, ${sublessonSlug}, now())
    ON CONFLICT (user_guid, lesson_slug, sublesson_slug)
    DO UPDATE SET completed_at = now()
  `;

  revalidatePath(`/lessons/${lessonSlug}`, "layout");
}

export async function unlockLesson(studentGuid: string, lessonSlug: string) {
  const session = await auth();
  if (session?.user?.role !== "Admin") {
    throw new Error("Not authorized");
  }

  await sql`
    INSERT INTO progress.lessons (user_guid, lesson_slug, unlocked_by, unlocked_at)
    VALUES (${studentGuid}, ${lessonSlug}, ${session.user.guid}, now())
    ON CONFLICT (user_guid, lesson_slug) DO NOTHING
  `;

  revalidatePath(`/students/${studentGuid}`);
}

export async function createStudent(data: {
  name: string;
  email: string;
  status: "Active" | "Inactive";
}): Promise<{ error: string } | { guid: string }> {
  const session = await auth();
  if (session?.user?.role !== "Admin") {
    throw new Error("Not authorized");
  }

  const existing = await getUserByEmail(data.email);
  if (existing) {
    return { error: "A user with this email already exists." };
  }

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const guid = randomUUID();

  await sql`
    INSERT INTO users (guid, name, email, role, status, password_hash)
    VALUES (${guid}, ${data.name}, ${data.email}, 'User', ${data.status}, ${passwordHash})
  `;

  revalidatePath("/students");
  return { guid };
}
