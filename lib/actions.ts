"use server";

import { revalidatePath } from "next/cache";
import { randomUUID, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { auth } from "@/auth";
import { sql } from "@/app/database";
import { requireTeacher } from "@/lib/guards";
import { sendSetPasswordEmail } from "@/lib/email";
import { getUserByEmail } from "@/lib/data";
import { getInteractions, getQuizIds, lessonExists } from "@/lib/lessons";
import { ANNOUNCEMENT_TYPES, type AnnouncementType } from "@/lib/types";

const RESET_TOKEN_TTL_HOURS = 24;
const PASSWORD_MIN_LENGTH = 8;
const ANNOUNCEMENT_TITLE_MAX_LENGTH = 200;

// Action arguments come straight from the client, so TypeScript types alone guarantee nothing.
const guidSchema = z.string().min(1).max(64);
const slugSchema = z.string().regex(/^[\w-]{1,100}$/, "Invalid slug");
const userSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(100),
  lastName: z.string().trim().min(1, "Last name is required.").max(100),
  email: z.email("Enter a valid email address.").trim().max(254),
  status: z.enum(["Active", "Inactive"]),
});
const announcementSchema = z.object({
  type: z.enum(ANNOUNCEMENT_TYPES),
  title: z
    .string()
    .trim()
    .min(1, "Title is required.")
    .max(ANNOUNCEMENT_TITLE_MAX_LENGTH, `Title must be at most ${ANNOUNCEMENT_TITLE_MAX_LENGTH} characters.`),
  body: z.string().trim().min(1, "Text is required.").max(10_000),
});

/** Parses input that the form validated already; a failure here means a bypassed or buggy client. */
function parseOrThrow<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new Error("Invalid input");
  }
  return result.data;
}

/** Like `parseOrThrow`, but returns the first issue as a form-displayable `{ error }`. */
function parseForForm<T>(schema: z.ZodType<T>, input: unknown): { error: string } | { data: T } {
  const result = schema.safeParse(input);
  return result.success ? { data: result.data } : { error: result.error.issues[0].message };
}

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

export async function unlockLesson(studentGuidInput: string, lessonSlugInput: string) {
  const teacher = await requireTeacher();
  const studentGuid = parseOrThrow(guidSchema, studentGuidInput);
  const lessonSlug = parseOrThrow(slugSchema, lessonSlugInput);

  const [student] = await sql`SELECT 1 FROM users WHERE guid = ${studentGuid} AND role = 'User'`;
  if (!student || !lessonExists(lessonSlug)) {
    throw new Error("Not found");
  }

  await sql`
    INSERT INTO progress.lessons (user_guid, lesson_slug, unlocked_by, unlocked_at)
    VALUES (${studentGuid}, ${lessonSlug}, ${teacher.guid}, now())
    ON CONFLICT (user_guid, lesson_slug) DO NOTHING
  `;

  revalidatePath(`/students/${studentGuid}`);
}

export async function createStudent(input: {
  firstName: string;
  lastName: string;
  email: string;
  status: "Active" | "Inactive";
}): Promise<{ error: string } | { guid: string }> {
  await requireTeacher();
  const parsed = parseForForm(userSchema, input);
  if ("error" in parsed) return parsed;
  const data = parsed.data;

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
export async function requestPasswordReset(emailInput: string): Promise<{ success: true }> {
  const email = z.email().safeParse(emailInput);
  const user = email.success ? await getUserByEmail(email.data) : null;
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
  tokenInput: string,
  passwordInput: string,
): Promise<{ error: string } | { success: true }> {
  const token = parseOrThrow(z.string().max(128), tokenInput);
  const password = parseForForm(
    z.string().min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`).max(200),
    passwordInput,
  );
  if ("error" in password) return password;

  // Consuming the token in the same statement that checks it means it can only be used once.
  const [row] = await sql`
    DELETE FROM password_reset_tokens
    WHERE token = ${token} AND expires_at > now()
    RETURNING user_guid
  `;
  if (!row) {
    return { error: "This link is invalid or has expired. Request a new one." };
  }

  const passwordHash = await bcrypt.hash(password.data, 10);
  await sql`UPDATE users SET password_hash = ${passwordHash} WHERE guid = ${row.user_guid}`;

  return { success: true };
}

export async function updateUser(
  guidInput: string,
  input: { firstName: string; lastName: string; email: string; status: "Active" | "Inactive" },
): Promise<{ error: string } | { success: true }> {
  await requireTeacher();
  const guid = parseOrThrow(guidSchema, guidInput);
  const parsed = parseForForm(userSchema, input);
  if ("error" in parsed) return parsed;
  const data = parsed.data;

  const existing = await getUserByEmail(data.email);
  if (existing && existing.guid !== guid) {
    return { error: "A user with this email already exists." };
  }

  // Only students: otherwise a teacher could point an admin's email at
  // themselves and take the account over via "forgot password".
  const updated = await sql`
    UPDATE users SET first_name = ${data.firstName}, last_name = ${data.lastName}, email = ${data.email}, status = ${data.status}
    WHERE guid = ${guid} AND role = 'User'
    RETURNING guid
  `;
  if (updated.length === 0) {
    throw new Error("Not found");
  }

  revalidatePath("/students");
  revalidatePath(`/students/${guid}`);
  return { success: true };
}

export async function createAnnouncement(input: {
  type: AnnouncementType;
  title: string;
  body: string;
}): Promise<{ error: string } | { success: true }> {
  const teacher = await requireTeacher();
  const parsed = parseForForm(announcementSchema, input);
  if ("error" in parsed) return parsed;

  await sql`
    INSERT INTO announcements (type, title, body, author_guid)
    VALUES (${parsed.data.type}, ${parsed.data.title}, ${parsed.data.body}, ${teacher.guid})
  `;

  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateAnnouncement(
  guidInput: string,
  input: { type: AnnouncementType; title: string; body: string },
): Promise<{ error: string } | { success: true }> {
  await requireTeacher();
  const guid = parseOrThrow(guidSchema, guidInput);
  const parsed = parseForForm(announcementSchema, input);
  if ("error" in parsed) return parsed;

  await sql`
    UPDATE announcements
    SET type = ${parsed.data.type}, title = ${parsed.data.title}, body = ${parsed.data.body}, updated_at = now()
    WHERE guid = ${guid}
  `;

  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteAnnouncement(guidInput: string): Promise<{ success: true }> {
  await requireTeacher();
  const guid = parseOrThrow(guidSchema, guidInput);

  await sql`DELETE FROM announcements WHERE guid = ${guid}`;

  revalidatePath("/dashboard");
  return { success: true };
}
