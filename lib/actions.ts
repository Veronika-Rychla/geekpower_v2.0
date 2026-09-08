"use server";

import { revalidatePath } from "next/cache";
import { randomUUID, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

import { auth } from "@/auth";
import { sql } from "@/app/database";
import { sendSetPasswordEmail } from "@/lib/email";
import { getUserByEmail } from "@/lib/data";
import { getInteractions, getQuizIds } from "@/lib/lessons";

const RESET_TOKEN_TTL_HOURS = 24;

/** Issues a fresh set-password token for a user, replacing any outstanding one. */
async function createPasswordResetToken(userGuid: string): Promise<string> {
  const token = randomBytes(32).toString("hex");

  await sql`DELETE FROM password_reset_tokens WHERE user_guid = ${userGuid}`;
  await sql`
    INSERT INTO password_reset_tokens (token, user_guid, expires_at)
    VALUES (${token}, ${userGuid}, now() + make_interval(hours => ${RESET_TOKEN_TTL_HOURS}))
  `;

  return token;
}

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

  const guid = randomUUID();

  await sql`
    INSERT INTO users (guid, first_name, last_name, email, role, status, password_hash)
    VALUES (${guid}, ${data.firstName}, ${data.lastName}, ${data.email}, 'User', ${data.status}, NULL)
  `;

  const token = await createPasswordResetToken(guid);
  try {
    await sendSetPasswordEmail(data.email, data.firstName, token);
  } catch (error) {
    // Don't fail student creation over a flaky/unconfigured email provider — the
    // student record and a valid token both exist; log the link so it can be
    // shared manually while the issue is sorted out.
    console.error(`Failed to send set-password email to ${data.email}:`, error);
    console.error(`Set-password link: ${process.env.APP_URL ?? "http://localhost:3000"}/set-password?token=${token}`);
  }

  revalidatePath("/students");
  return { guid };
}

/** Student-facing "forgot password" flow. Always reports success so we don't leak which emails are registered. */
export async function requestPasswordReset(email: string): Promise<{ success: true }> {
  const user = await getUserByEmail(email);
  if (user) {
    const token = await createPasswordResetToken(user.guid);
    try {
      await sendSetPasswordEmail(user.email, user.first_name, token);
    } catch (error) {
      console.error(`Failed to send password reset email to ${user.email}:`, error);
    }
  }

  return { success: true };
}

export async function setPassword(
  token: string,
  password: string,
): Promise<{ error: string } | { success: true }> {
  const [row] = await sql`
    SELECT user_guid, expires_at FROM password_reset_tokens WHERE token = ${token}
  `;

  if (!row || new Date(row.expires_at as string) < new Date()) {
    return { error: "This link is invalid or has expired. Request a new one." };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await sql`UPDATE users SET password_hash = ${passwordHash} WHERE guid = ${row.user_guid}`;
  await sql`DELETE FROM password_reset_tokens WHERE token = ${token}`;

  return { success: true };
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
