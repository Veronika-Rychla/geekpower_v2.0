"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";

import { auth } from "@/auth";
import { sql } from "@/app/database";
import { getUserByEmail } from "@/lib/data";
import { getInteractions, getQuizIds } from "@/lib/lessons";

const DEFAULT_PASSWORD = "password123";

export async function completeSublesson(lessonSlug: string, sublessonSlug: string) {
  const session = await auth();
  const userGuid = session?.user?.guid;

  if (!userGuid) {
    throw new Error("Not authenticated");
  }

  const quizIds = getQuizIds(lessonSlug, sublessonSlug);
  if (quizIds.length > 0) {
    const interactions = await getInteractions(userGuid, lessonSlug, sublessonSlug);
    const allQuizzesCorrect = quizIds.every((quizId) => {
      const response = interactions[quizId]?.response as { correct?: boolean } | undefined;
      return response?.correct === true;
    });
    if (!allQuizzesCorrect) {
      throw new Error("Answer all quizzes correctly before finishing this section");
    }
  }

  await sql`
    INSERT INTO progress.sublessons (user_guid, lesson_slug, sublesson_slug, completed_at)
    VALUES (${userGuid}, ${lessonSlug}, ${sublessonSlug}, now())
    ON CONFLICT (user_guid, lesson_slug, sublesson_slug)
    DO UPDATE SET completed_at = now()
  `;

  revalidatePath(`/lessons/${lessonSlug}`, "layout");
}

export async function saveInteraction(
  lessonSlug: string,
  sublessonSlug: string,
  interactionId: string,
  type: string,
  response: unknown,
) {
  const session = await auth();
  const userGuid = session?.user?.guid;

  if (!userGuid) {
    throw new Error("Not authenticated");
  }

  await sql`
    INSERT INTO progress.interactions (user_guid, lesson_slug, sublesson_slug, interaction_id, type, response, completed_at)
    VALUES (${userGuid}, ${lessonSlug}, ${sublessonSlug}, ${interactionId}, ${type}, ${JSON.stringify(response)}::jsonb, now())
    ON CONFLICT (user_guid, lesson_slug, sublesson_slug, interaction_id)
    DO UPDATE SET response = EXCLUDED.response, type = EXCLUDED.type, completed_at = now()
  `;

  revalidatePath(`/lessons/${lessonSlug}/${sublessonSlug}`);
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
  firstName: string;
  lastName: string;
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
    INSERT INTO users (guid, first_name, last_name, email, role, status, password_hash)
    VALUES (${guid}, ${data.firstName}, ${data.lastName}, ${data.email}, 'User', ${data.status}, ${passwordHash})
  `;

  revalidatePath("/students");
  return { guid };
}

export async function updateUser(
  guid: string,
  data: { firstName: string; lastName: string; email: string; status: "Active" | "Inactive" },
): Promise<{ error: string } | { success: true }> {
  const session = await auth();
  if (session?.user?.role !== "Admin") {
    throw new Error("Not authorized");
  }

  const existing = await getUserByEmail(data.email);
  if (existing && existing.guid !== guid) {
    return { error: "A user with this email already exists." };
  }

  await sql`
    UPDATE users SET first_name = ${data.firstName}, last_name = ${data.lastName}, email = ${data.email}, status = ${data.status}
    WHERE guid = ${guid}
  `;

  revalidatePath("/students");
  revalidatePath(`/students/${guid}`);
  return { success: true };
}
