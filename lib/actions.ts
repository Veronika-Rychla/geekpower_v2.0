"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { auth } from "@/auth";
import { sql } from "@/app/database";
import { requireAdmin, requireTeacher } from "@/lib/guards";
import { sendSetPasswordEmail } from "@/lib/email";
import { getUserByEmail } from "@/lib/data";
import { getInteractions, getLessons, getQuizIds, lessonExists } from "@/lib/lessons";
import { ANNOUNCEMENT_TYPES, BLOG_POST_TYPES, type AnnouncementType, type BlogPostType } from "@/lib/types";
import { BLOG_POSTS_CACHE_TAG } from "@/lib/blog";
import { signBlogImageUpload, type SignedImageUpload } from "@/lib/cloudinary";
import { estimateReadTime } from "@/components/blog/markdown/read-time";

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
const blogPostSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required.")
    .max(ANNOUNCEMENT_TITLE_MAX_LENGTH, `Title must be at most ${ANNOUNCEMENT_TITLE_MAX_LENGTH} characters.`),
  summary: z.string().trim().min(1, "Summary is required.").max(1_000, "Summary must be at most 1000 characters."),
  message: z.string().trim().min(1, "Message is required.").max(100_000),
  type: z
    .array(z.enum(BLOG_POST_TYPES))
    .min(1, "Pick at least one type.")
    .transform((types) => [...new Set(types)]),
  isDraft: z.boolean(),
});

type BlogPostInput = { title: string; summary: string; message: string; type: BlogPostType[]; isDraft: boolean };

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

  // Move on to the next sublesson, or to the next unlocked lesson after the last one.
  const role = session?.user?.role;
  const nextHref = role
    ? await getNextSublessonHref({ guid: userGuid, role }, lessonSlug, sublessonSlug)
    : null;
  if (nextHref) {
    redirect(nextHref);
  }
}

async function getNextSublessonHref(
  user: Parameters<typeof getLessons>[0],
  lessonSlug: string,
  sublessonSlug: string,
): Promise<string | null> {
  const lessons = await getLessons(user);
  const lessonIndex = lessons.findIndex((l) => l.slug === lessonSlug);
  if (lessonIndex === -1) {
    return null;
  }

  const sublessons = lessons[lessonIndex].sublessons;
  const next = sublessons[sublessons.findIndex((s) => s.slug === sublessonSlug) + 1];
  if (next) {
    return `/lessons/${lessonSlug}/${next.slug}`;
  }

  // The lesson index route resumes at the first unfinished sublesson.
  const nextLesson = lessons.slice(lessonIndex + 1).find((l) => l.sublessons.length > 0);
  return nextLesson ? `/lessons/${nextLesson.slug}` : null;
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

export async function createBlogPost(
  input: BlogPostInput,
): Promise<{ error: string } | { success: true; guid: string }> {
  const teacher = await requireTeacher();
  const parsed = parseForForm(blogPostSchema, input);
  if ("error" in parsed) return parsed;
  const { title, summary, message, type, isDraft } = parsed.data;

  const [row] = await sql`
    INSERT INTO blog_posts (title, summary, message, type, is_draft, read_time, author_guid)
    VALUES (${title}, ${summary}, ${message}, ${type}, ${isDraft}, ${estimateReadTime(message)}, ${teacher.guid})
    RETURNING guid
  `;

  revalidatePath("/dashboard");
  revalidatePath("/blog", "layout");
  revalidateTag(BLOG_POSTS_CACHE_TAG, "max");
  return { success: true, guid: row.guid as string };
}

export async function updateBlogPost(
  guidInput: string,
  input: BlogPostInput,
): Promise<{ error: string } | { success: true; guid: string }> {
  await requireTeacher();
  const guid = parseOrThrow(guidSchema, guidInput);
  const parsed = parseForForm(blogPostSchema, input);
  if ("error" in parsed) return parsed;
  const { title, summary, message, type, isDraft } = parsed.data;

  await sql`
    UPDATE blog_posts
    SET title = ${title}, summary = ${summary}, message = ${message}, type = ${type},
        is_draft = ${isDraft}, read_time = ${estimateReadTime(message)}, updated_at = now()
    WHERE guid = ${guid}
  `;

  revalidatePath("/dashboard");
  revalidatePath("/blog", "layout");
  revalidateTag(BLOG_POSTS_CACHE_TAG, "max");
  return { success: true, guid };
}

/** Signed parameters for uploading one blog image from the browser straight to Cloudinary. */
export async function createBlogImageUpload(): Promise<{ error: string } | SignedImageUpload> {
  await requireTeacher();
  const upload = signBlogImageUpload();
  if (!upload) {
    console.error("Cloudinary env vars are not set (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)");
    return { error: "Image upload is not configured." };
  }
  return upload;
}

/** With `redirectToBlog`, navigates to /blog afterwards (used on the deleted post's own page). */
export async function deleteBlogPost(guidInput: string, redirectToBlog = false): Promise<{ success: true }> {
  await requireTeacher();
  const guid = parseOrThrow(guidSchema, guidInput);

  await sql`DELETE FROM blog_posts WHERE guid = ${guid}`;

  revalidatePath("/dashboard");
  revalidatePath("/blog", "layout");
  revalidateTag(BLOG_POSTS_CACHE_TAG, "max");
  if (redirectToBlog === true) {
    redirect("/blog");
  }
  return { success: true };
}

export async function setContactMessageResolved(guidInput: string, resolvedInput: boolean): Promise<{ success: true }> {
  await requireTeacher();
  const guid = parseOrThrow(guidSchema, guidInput);
  const resolved = parseOrThrow(z.boolean(), resolvedInput);

  await sql`UPDATE contact_messages SET resolved = ${resolved} WHERE guid = ${guid}`;

  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteContactMessage(guidInput: string): Promise<{ success: true }> {
  await requireAdmin();
  const guid = parseOrThrow(guidSchema, guidInput);

  await sql`DELETE FROM contact_messages WHERE guid = ${guid}`;

  revalidatePath("/dashboard");
  return { success: true };
}
