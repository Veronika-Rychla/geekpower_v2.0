"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { sql } from "@/app/database";
import {
  requireAdmin,
  requireTeacher,
  requireUser,
  type CurrentUser,
} from "@/lib/guards";
import { sendSetPasswordEmail } from "@/lib/email";
import { getUserByEmail } from "@/lib/data";
import {
  getAccessibleSublesson,
  getInteractions,
  getLessons,
} from "@/lib/lessons";
import { compileLessonSource, getLessonQuizzes } from "@/lib/mdx/lesson-mdx";
import { gradeQuiz, isResponseCorrect } from "@/lib/quizzes";
import { SLUG_MAX_LENGTH, SLUG_PATTERN } from "@/lib/slug";
import {
  ANNOUNCEMENT_TYPES,
  BLOG_POST_TYPES,
  type AnnouncementType,
  type BlogPostType,
} from "@/lib/types";
import { BLOG_POSTS_CACHE_TAG } from "@/lib/blog";
import {
  IMAGE_FOLDERS,
  signImageUpload,
  type ImageFolder,
  type SignedImageUpload,
} from "@/lib/cloudinary";
import { estimateReadTime } from "@/components/blog/markdown/read-time";

const RESET_TOKEN_TTL_HOURS = 24;
const PASSWORD_MIN_LENGTH = 8;
const ANNOUNCEMENT_TITLE_MAX_LENGTH = 200;
const CONTENT_TITLE_MAX_LENGTH = 200;
const SUBLESSON_BODY_MAX_LENGTH = 200_000;
/** How many earlier versions of each section content.sublesson_versions keeps. */
const SUBLESSON_VERSIONS_KEPT = 10;

// Action arguments come straight from the client, so TypeScript types alone guarantee nothing.
const guidSchema = z.string().min(1).max(64);
const lessonSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required.")
    .max(
      CONTENT_TITLE_MAX_LENGTH,
      `Title must be at most ${CONTENT_TITLE_MAX_LENGTH} characters.`,
    ),
  slug: z
    .string()
    .trim()
    .min(1, "Name in URL is required.")
    .max(SLUG_MAX_LENGTH, `Name in URL must be at most ${SLUG_MAX_LENGTH} characters.`)
    .regex(
      SLUG_PATTERN,
      "Name in URL may contain only lowercase letters, digits and single dashes.",
    ),
  isDraft: z.boolean(),
});
const sublessonSchema = lessonSchema.extend({
  body: z
    .string()
    .trim()
    .min(1, "Content is required.")
    .max(
      SUBLESSON_BODY_MAX_LENGTH,
      `Content must be at most ${SUBLESSON_BODY_MAX_LENGTH} characters.`,
    ),
});

type LessonInput = { title: string; slug: string; isDraft: boolean };
type SublessonInput = LessonInput & { body: string };

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
    .max(
      ANNOUNCEMENT_TITLE_MAX_LENGTH,
      `Title must be at most ${ANNOUNCEMENT_TITLE_MAX_LENGTH} characters.`,
    ),
  body: z.string().trim().min(1, "Text is required.").max(10_000),
});
const blogPostSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required.")
    .max(
      ANNOUNCEMENT_TITLE_MAX_LENGTH,
      `Title must be at most ${ANNOUNCEMENT_TITLE_MAX_LENGTH} characters.`,
    ),
  summary: z
    .string()
    .trim()
    .min(1, "Summary is required.")
    .max(1_000, "Summary must be at most 1000 characters."),
  message: z.string().trim().min(1, "Message is required.").max(100_000),
  type: z
    .array(z.enum(BLOG_POST_TYPES))
    .min(1, "Pick at least one type.")
    .transform((types) => [...new Set(types)]),
  isDraft: z.boolean(),
});

type BlogPostInput = {
  title: string;
  summary: string;
  message: string;
  type: BlogPostType[];
  isDraft: boolean;
};

/** Parses input that the form validated already; a failure here means a bypassed or buggy client. */
function parseOrThrow<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new Error("Invalid input");
  }
  return result.data;
}

/** Like `parseOrThrow`, but returns the first issue as a form-displayable `{ error }`. */
function parseForForm<T>(
  schema: z.ZodType<T>,
  input: unknown,
): { error: string } | { data: T } {
  const result = schema.safeParse(input);
  return result.success
    ? { data: result.data }
    : { error: result.error.issues[0].message };
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

// --- Lessons: student progress ---

export async function completeSublesson(sublessonGuidInput: string) {
  const user = await requireUser();
  const sublessonGuid = parseOrThrow(guidSchema, sublessonGuidInput);

  const sublesson = await getAccessibleSublesson(user, sublessonGuid);
  if (!sublesson) {
    throw new Error("Not found");
  }

  const quizzes = await getLessonQuizzes(sublesson.body);
  if (quizzes.length > 0) {
    const interactions = await getInteractions(user.guid, sublesson.guid);
    if (
      !quizzes.every((quiz) =>
        isResponseCorrect(interactions[quiz.id]?.response),
      )
    ) {
      throw new Error(
        "Answer all quizzes correctly before finishing this section",
      );
    }
  }

  await sql`
    INSERT INTO progress.sublessons (user_guid, sublesson_guid, completed_at)
    VALUES (${user.guid}, ${sublesson.guid}, now())
    ON CONFLICT (user_guid, sublesson_guid)
    DO UPDATE SET completed_at = now()
  `;

  revalidatePath(`/lessons/${sublesson.lessonSlug}`, "layout");

  // Move on to the next section, or to the next lesson after the last one.
  const nextHref = await getNextSublessonHref(user, sublesson.guid);
  if (nextHref) {
    redirect(nextHref);
  }
}

async function getNextSublessonHref(
  user: CurrentUser,
  sublessonGuid: string,
): Promise<string | null> {
  const lessons = await getLessons(user);
  const lessonIndex = lessons.findIndex((l) =>
    l.sublessons.some((s) => s.guid === sublessonGuid),
  );
  if (lessonIndex === -1) {
    return null;
  }

  const { slug, sublessons } = lessons[lessonIndex];
  const next =
    sublessons[sublessons.findIndex((s) => s.guid === sublessonGuid) + 1];
  if (next) {
    return `/lessons/${slug}/${next.slug}`;
  }

  // The lesson index route resumes at the first unfinished section.
  const nextLesson = lessons
    .slice(lessonIndex + 1)
    .find((l) => l.sublessons.length > 0);
  return nextLesson ? `/lessons/${nextLesson.slug}` : null;
}

/** Grades a quiz answer on the server (the correct answer never reaches the browser) and saves it. */
export async function answerQuiz(
  sublessonGuidInput: string,
  quizIdInput: string,
  answer: unknown,
): Promise<{ correct: boolean }> {
  const user = await requireUser();
  const sublessonGuid = parseOrThrow(guidSchema, sublessonGuidInput);
  const quizId = parseOrThrow(z.string().max(64), quizIdInput);

  const sublesson = await getAccessibleSublesson(user, sublessonGuid);
  const quiz =
    sublesson &&
    (await getLessonQuizzes(sublesson.body)).find((q) => q.id === quizId);
  if (!sublesson || !quiz) {
    throw new Error("Not found");
  }

  const graded = gradeQuiz(quiz, answer);
  if (!graded) {
    throw new Error("Invalid input");
  }

  await sql`
    INSERT INTO progress.interactions (user_guid, sublesson_guid, interaction_id, type, response, completed_at)
    VALUES (${user.guid}, ${sublesson.guid}, ${quiz.id}, ${quiz.kind}, ${JSON.stringify(graded.response)}::jsonb, now())
    ON CONFLICT (user_guid, sublesson_guid, interaction_id)
    DO UPDATE SET response = EXCLUDED.response, type = EXCLUDED.type, completed_at = now()
  `;

  revalidatePath(`/lessons/${sublesson.lessonSlug}/${sublesson.slug}`);
  return { correct: graded.correct };
}

export async function unlockLesson(
  studentGuidInput: string,
  lessonGuidInput: string,
) {
  const teacher = await requireTeacher();
  const studentGuid = parseOrThrow(guidSchema, studentGuidInput);
  const lessonGuid = parseOrThrow(guidSchema, lessonGuidInput);

  const [student] =
    await sql`SELECT 1 FROM users WHERE guid = ${studentGuid} AND role = 'User'`;
  const [lesson] =
    await sql`SELECT 1 FROM content.lessons WHERE guid = ${lessonGuid}`;
  if (!student || !lesson) {
    throw new Error("Not found");
  }

  await sql`
    INSERT INTO progress.lessons (user_guid, lesson_guid, unlocked_by, unlocked_at)
    VALUES (${studentGuid}, ${lessonGuid}, ${teacher.guid}, now())
    ON CONFLICT (user_guid, lesson_guid) DO NOTHING
  `;

  revalidatePath(`/students/${studentGuid}`);
}

// --- Lessons: content editing (teachers) ---

type ContentResult = { error: string } | { success: true; href: string };

/** Lesson pages, the lesson list and the student pages all show lesson content. */
function revalidateLessonContent() {
  revalidatePath("/lessons", "layout");
  revalidatePath("/students", "layout");
}

/** Postgres unique_violation, raised here by a slug that's already taken. */
function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === "23505";
}

export async function createLesson(input: LessonInput): Promise<ContentResult> {
  await requireTeacher();
  const parsed = parseForForm(lessonSchema, input);
  if ("error" in parsed) return parsed;
  const { title, slug, isDraft } = parsed.data;

  try {
    await sql`
      INSERT INTO content.lessons (slug, title, is_draft, position)
      VALUES (${slug}, ${title}, ${isDraft}, (SELECT COALESCE(MAX(position), 0) + 1 FROM content.lessons))
    `;
  } catch (error) {
    if (isUniqueViolation(error))
      return { error: "Another lesson already uses this name in URL." };
    throw error;
  }

  revalidateLessonContent();
  return { success: true, href: "/lessons" };
}

export async function updateLesson(
  guidInput: string,
  input: LessonInput,
): Promise<ContentResult> {
  await requireTeacher();
  const guid = parseOrThrow(guidSchema, guidInput);
  const parsed = parseForForm(lessonSchema, input);
  if ("error" in parsed) return parsed;
  const { title, slug, isDraft } = parsed.data;

  try {
    const updated = await sql`
      UPDATE content.lessons
      SET slug = ${slug}, title = ${title}, is_draft = ${isDraft}, updated_at = now()
      WHERE guid = ${guid}
      RETURNING guid
    `;
    if (updated.length === 0) throw new Error("Not found");
  } catch (error) {
    if (isUniqueViolation(error))
      return { error: "Another lesson already uses this name in URL." };
    throw error;
  }

  revalidateLessonContent();
  return { success: true, href: "/lessons" };
}

/** Deletes the lesson with its sections and every student's progress in it (FK cascades). */
export async function deleteLesson(
  guidInput: string,
): Promise<{ success: true }> {
  await requireTeacher();
  const guid = parseOrThrow(guidSchema, guidInput);

  await sql`DELETE FROM content.lessons WHERE guid = ${guid}`;

  revalidateLessonContent();
  return { success: true };
}

/** Compiles a section for the editor's live preview, or returns the compile error to show instead. */
export async function previewSublesson(
  sourceInput: string,
): Promise<{ compiledSource: string } | { error: string }> {
  await requireTeacher();
  const source = parseOrThrow(
    z.string().max(SUBLESSON_BODY_MAX_LENGTH),
    sourceInput,
  );

  const result = await compileLessonSource(source);
  return "error" in result ? result : { compiledSource: result.compiledSource };
}

/** Like `parseForForm`, then also requires the body to compile. */
async function parseSublessonInput(
  input: unknown,
): Promise<{ error: string } | { data: z.infer<typeof sublessonSchema> }> {
  const parsed = parseForForm(sublessonSchema, input);
  if ("error" in parsed) return parsed;
  const compiled = await compileLessonSource(parsed.data.body);
  if ("error" in compiled) {
    return {
      error: `The content has an error, so it can't be saved:\n${compiled.error}`,
    };
  }
  return parsed;
}

export async function createSublesson(
  lessonGuidInput: string,
  input: SublessonInput,
): Promise<ContentResult> {
  const teacher = await requireTeacher();
  const lessonGuid = parseOrThrow(guidSchema, lessonGuidInput);
  const parsed = await parseSublessonInput(input);
  if ("error" in parsed) return parsed;
  const { title, slug, isDraft, body } = parsed.data;

  let lessonSlug: string;
  try {
    const [row] = await sql`
      INSERT INTO content.sublessons (lesson_guid, slug, title, body, is_draft, position, updated_by)
      SELECT l.guid, ${slug}, ${title}, ${body}, ${isDraft},
             (SELECT COALESCE(MAX(position), 0) + 1 FROM content.sublessons WHERE lesson_guid = l.guid),
             ${teacher.guid}
      FROM content.lessons l
      WHERE l.guid = ${lessonGuid}
      RETURNING (SELECT slug FROM content.lessons WHERE guid = ${lessonGuid}) AS lesson_slug
    `;
    if (!row) throw new Error("Not found");
    lessonSlug = row.lesson_slug as string;
  } catch (error) {
    if (isUniqueViolation(error))
      return {
        error: "Another section of this lesson already uses this name in URL.",
      };
    throw error;
  }

  revalidateLessonContent();
  return { success: true, href: `/lessons/${lessonSlug}/${slug}` };
}

/**
 * Saves a section. When the title or body changes, the content being replaced is
 * first copied to content.sublesson_versions (the CTE sees the row as it was before
 * the UPDATE), then versions beyond the newest SUBLESSON_VERSIONS_KEPT are dropped.
 */
export async function updateSublesson(
  guidInput: string,
  input: SublessonInput,
): Promise<ContentResult> {
  const teacher = await requireTeacher();
  const guid = parseOrThrow(guidSchema, guidInput);
  const parsed = await parseSublessonInput(input);
  if ("error" in parsed) return parsed;
  const { title, slug, isDraft, body } = parsed.data;

  let lessonSlug: string;
  try {
    const [updated] = await sql.transaction([
      sql`
        WITH snapshot AS (
          INSERT INTO content.sublesson_versions (sublesson_guid, title, body, saved_at, saved_by)
          SELECT guid, title, body, COALESCE(updated_at, created_at), updated_by
          FROM content.sublessons
          WHERE guid = ${guid} AND (title, body) IS DISTINCT FROM (${title}::text, ${body}::text)
        )
        UPDATE content.sublessons s
        SET slug = ${slug}, title = ${title}, body = ${body}, is_draft = ${isDraft},
            updated_at = now(), updated_by = ${teacher.guid}
        FROM content.lessons l
        WHERE s.guid = ${guid} AND l.guid = s.lesson_guid
        RETURNING l.slug AS lesson_slug
      `,
      sql`
        DELETE FROM content.sublesson_versions
        WHERE sublesson_guid = ${guid}
          AND guid NOT IN (
            SELECT guid FROM content.sublesson_versions
            WHERE sublesson_guid = ${guid}
            ORDER BY saved_at DESC
            LIMIT ${SUBLESSON_VERSIONS_KEPT}
          )
      `,
    ]);
    const [row] = updated;
    if (!row) throw new Error("Not found");
    lessonSlug = row.lesson_slug as string;
  } catch (error) {
    if (isUniqueViolation(error))
      return {
        error: "Another section of this lesson already uses this name in URL.",
      };
    throw error;
  }

  revalidateLessonContent();
  return { success: true, href: `/lessons/${lessonSlug}/${slug}` };
}

/** An earlier version's content, for the section editor to load in place of the current one. */
export async function getSublessonVersion(
  versionGuidInput: string,
): Promise<{ title: string; body: string } | null> {
  await requireTeacher();
  const versionGuid = parseOrThrow(guidSchema, versionGuidInput);

  const [row] = await sql`
    SELECT title, body FROM content.sublesson_versions WHERE guid = ${versionGuid}
  `;
  return row ? { title: row.title as string, body: row.body as string } : null;
}

/** Deletes the section and every student's progress in it (FK cascades). */
export async function deleteSublesson(
  guidInput: string,
): Promise<{ success: true }> {
  await requireTeacher();
  const guid = parseOrThrow(guidSchema, guidInput);

  await sql`DELETE FROM content.sublessons WHERE guid = ${guid}`;

  revalidateLessonContent();
  return { success: true };
}

type ReorderResult = { error: string } | { success: true };

const REORDER_CONFLICT =
  "The lessons changed in the meantime. Reload the page and try again.";

/** Distinct guids in their new display order. */
const orderSchema = z
  .array(guidSchema)
  .max(1000)
  .refine((guids) => new Set(guids).size === guids.length);

/** True when `ordered` is a permutation of `current`, i.e. nothing was added or removed since the page loaded. */
function isSameSet(ordered: string[], current: string[]): boolean {
  const currentSet = new Set(current);
  return (
    ordered.length === currentSet.size &&
    ordered.every((guid) => currentSet.has(guid))
  );
}

/*
 * Positions are UNIQUE and checked per row, so renumbering in place can collide
 * midway. Each reorder first shifts the whole group above its current maximum,
 * then writes the final 1..n, both in one transaction.
 */

/** Sets the display order of all lessons to `guidsInput` (every lesson's guid, drafts included). */
export async function reorderLessons(
  guidsInput: string[],
): Promise<ReorderResult> {
  await requireTeacher();
  const guids = parseOrThrow(orderSchema, guidsInput);

  const current = await sql`SELECT guid::text AS guid FROM content.lessons`;
  if (
    !isSameSet(
      guids,
      current.map((row) => row.guid as string),
    )
  )
    return { error: REORDER_CONFLICT };

  await sql.transaction([
    sql`UPDATE content.lessons SET position = position + (SELECT MAX(position) FROM content.lessons)`,
    sql`
      UPDATE content.lessons l
      SET position = o.position
      FROM unnest(${guids}::text[]) WITH ORDINALITY AS o(guid, position)
      WHERE l.guid::text = o.guid
    `,
  ]);

  revalidateLessonContent();
  return { success: true };
}

/** Sets the display order of a lesson's sections to `guidsInput` (every section's guid, drafts included). */
export async function reorderSublessons(
  lessonGuidInput: string,
  guidsInput: string[],
): Promise<ReorderResult> {
  await requireTeacher();
  const lessonGuid = parseOrThrow(guidSchema, lessonGuidInput);
  const guids = parseOrThrow(orderSchema, guidsInput);

  const current =
    await sql`SELECT guid::text AS guid FROM content.sublessons WHERE lesson_guid::text = ${lessonGuid}`;
  if (
    !isSameSet(
      guids,
      current.map((row) => row.guid as string),
    )
  )
    return { error: REORDER_CONFLICT };

  await sql.transaction([
    sql`
      UPDATE content.sublessons
      SET position = position + (SELECT MAX(position) FROM content.sublessons WHERE lesson_guid::text = ${lessonGuid})
      WHERE lesson_guid::text = ${lessonGuid}
    `,
    sql`
      UPDATE content.sublessons s
      SET position = o.position
      FROM unnest(${guids}::text[]) WITH ORDINALITY AS o(guid, position)
      WHERE s.lesson_guid::text = ${lessonGuid} AND s.guid::text = o.guid
    `,
  ]);

  revalidateLessonContent();
  return { success: true };
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
    console.error(
      `Set-password link: ${process.env.APP_URL ?? "http://localhost:3000"}/set-password?token=${token}`,
    );
  }

  revalidatePath("/students");
  return { guid };
}

/** Student-facing "forgot password" flow. Always reports success so we don't leak which emails are registered. */
export async function requestPasswordReset(
  emailInput: string,
): Promise<{ success: true }> {
  const email = z.email().safeParse(emailInput);
  const user = email.success ? await getUserByEmail(email.data) : null;
  if (user) {
    const token = await createPasswordResetToken(user.guid);
    try {
      await sendSetPasswordEmail(user.email, user.first_name, token);
    } catch (error) {
      console.error(
        `Failed to send password reset email to ${user.email}:`,
        error,
      );
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
    z
      .string()
      .min(
        PASSWORD_MIN_LENGTH,
        `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
      )
      .max(200),
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
  input: {
    firstName: string;
    lastName: string;
    email: string;
    status: "Active" | "Inactive";
  },
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

export async function deleteAnnouncement(
  guidInput: string,
): Promise<{ success: true }> {
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

/** Signed parameters for uploading one image (blog post or lesson) from the browser straight to Cloudinary. */
export async function createImageUpload(
  folderInput: ImageFolder,
): Promise<{ error: string } | SignedImageUpload> {
  await requireTeacher();
  const folder = parseOrThrow(z.enum(IMAGE_FOLDERS), folderInput);
  const upload = signImageUpload(folder);
  if (!upload) {
    console.error(
      "Cloudinary env vars are not set (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)",
    );
    return { error: "Image upload is not configured." };
  }
  return upload;
}

/** With `redirectToBlog`, navigates to /blog afterwards (used on the deleted post's own page). */
export async function deleteBlogPost(
  guidInput: string,
  redirectToBlog = false,
): Promise<{ success: true }> {
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

export async function setContactMessageResolved(
  guidInput: string,
  resolvedInput: boolean,
): Promise<{ success: true }> {
  await requireTeacher();
  const guid = parseOrThrow(guidSchema, guidInput);
  const resolved = parseOrThrow(z.boolean(), resolvedInput);

  await sql`UPDATE contact_messages SET resolved = ${resolved} WHERE guid = ${guid}`;

  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteContactMessage(
  guidInput: string,
): Promise<{ success: true }> {
  await requireAdmin();
  const guid = parseOrThrow(guidSchema, guidInput);

  await sql`DELETE FROM contact_messages WHERE guid = ${guid}`;

  revalidatePath("/dashboard");
  return { success: true };
}
