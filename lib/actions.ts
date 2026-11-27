"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { after } from "next/server";
import { createHash, randomUUID, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { sql } from "@/app/database";
import {
  getCurrentUser,
  requireAdmin,
  requireTeacher,
  requireUser,
  type CurrentUser,
} from "@/lib/guards";
import { sendSetPasswordEmail, setPasswordLink } from "@/lib/email";
import { clientIpFromHeaders, createRateLimiter } from "@/lib/rate-limit";
import { getDictionary, getLocale, type Dictionary } from "@/lib/dictionary";
import { fill, hasLocale, type Locale } from "@/lib/i18n";
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
/** "Forgot password?" requests: a person needs a couple; more is someone spamming an inbox. */
const checkResetRateLimitByIp = createRateLimiter({
  limit: 10,
  windowSeconds: 3600,
});
const checkResetRateLimitByEmail = createRateLimiter({
  limit: 3,
  windowSeconds: 3600,
});
const PASSWORD_MIN_LENGTH = 8;
const ANNOUNCEMENT_TITLE_MAX_LENGTH = 200;
const CONTENT_TITLE_MAX_LENGTH = 200;
const SUBLESSON_BODY_MAX_LENGTH = 200_000;
/** How many earlier versions of each section content.sublesson_versions keeps. */
const SUBLESSON_VERSIONS_KEPT = 10;

// Action arguments come straight from the client, so TypeScript types alone guarantee nothing.
const guidSchema = z.string().min(1).max(64);

/*
 * The schemas take the request's error messages (messages/*.json `errors`),
 * so a form shows server-side validation errors in the user's language.
 */
type ErrorMessages = Dictionary["errors"];

function lessonSchema(e: ErrorMessages) {
  return z.object({
    title: z
      .string()
      .trim()
      .min(1, e.titleRequired)
      .max(
        CONTENT_TITLE_MAX_LENGTH,
        fill(e.titleTooLong, { max: CONTENT_TITLE_MAX_LENGTH }),
      ),
    slug: z
      .string()
      .trim()
      .min(1, e.slugRequired)
      .max(SLUG_MAX_LENGTH, fill(e.slugTooLong, { max: SLUG_MAX_LENGTH }))
      .regex(SLUG_PATTERN, e.slugPattern),
    isDraft: z.boolean(),
  });
}

function sublessonSchema(e: ErrorMessages) {
  return lessonSchema(e).extend({
    body: z
      .string()
      .trim()
      .min(1, e.contentRequired)
      .max(
        SUBLESSON_BODY_MAX_LENGTH,
        fill(e.contentTooLong, { max: SUBLESSON_BODY_MAX_LENGTH }),
      ),
  });
}

type LessonInput = { title: string; slug: string; isDraft: boolean };
type SublessonInput = LessonInput & { body: string };

function userSchema(e: ErrorMessages) {
  return z.object({
    firstName: z.string().trim().min(1, e.firstNameRequired).max(100),
    lastName: z.string().trim().min(1, e.lastNameRequired).max(100),
    email: z.email(e.emailInvalid).trim().toLowerCase().max(254),
    status: z.enum(["Active", "Inactive"]),
  });
}

function announcementSchema(e: ErrorMessages) {
  return z.object({
    type: z.enum(ANNOUNCEMENT_TYPES),
    title: z
      .string()
      .trim()
      .min(1, e.titleRequired)
      .max(
        ANNOUNCEMENT_TITLE_MAX_LENGTH,
        fill(e.titleTooLong, { max: ANNOUNCEMENT_TITLE_MAX_LENGTH }),
      ),
    body: z.string().trim().min(1, e.textRequired).max(10_000),
  });
}

function blogPostSchema(e: ErrorMessages) {
  return z.object({
    title: z
      .string()
      .trim()
      .min(1, e.titleRequired)
      .max(
        ANNOUNCEMENT_TITLE_MAX_LENGTH,
        fill(e.titleTooLong, { max: ANNOUNCEMENT_TITLE_MAX_LENGTH }),
      ),
    summary: z
      .string()
      .trim()
      .min(1, e.summaryRequired)
      .max(1_000, fill(e.summaryTooLong, { max: 1_000 })),
    message: z.string().trim().min(1, e.messageRequired).max(100_000),
    type: z
      .array(z.enum(BLOG_POST_TYPES))
      .min(1, e.typeRequired)
      .transform((types) => [...new Set(types)]),
    isDraft: z.boolean(),
  });
}

/** The current request's error messages. */
async function errorMessages(): Promise<ErrorMessages> {
  return (await getDictionary()).errors;
}

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

/**
 * The DB keeps only a SHA-256 of each token, so a leaked table can't be used
 * to set anyone's password. The raw token exists only in the emailed link.
 */
function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Issues a fresh set-password token for a user, replacing any outstanding one. Returns the raw token. */
async function createPasswordResetToken(userGuid: string): Promise<string> {
  const token = randomBytes(32).toString("hex");

  await sql.transaction([
    sql`DELETE FROM password_reset_tokens WHERE user_guid = ${userGuid} OR expires_at <= now()`,
    sql`
      INSERT INTO password_reset_tokens (token, user_guid, expires_at)
      VALUES (${hashResetToken(token)}, ${userGuid}, now() + make_interval(hours => ${RESET_TOKEN_TTL_HOURS}))
    `,
  ]);

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
      throw new Error((await errorMessages()).quizzesFirst);
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
  const e = await errorMessages();
  const parsed = parseForForm(lessonSchema(e), input);
  if ("error" in parsed) return parsed;
  const { title, slug, isDraft } = parsed.data;

  try {
    await sql`
      INSERT INTO content.lessons (slug, title, is_draft, position)
      VALUES (${slug}, ${title}, ${isDraft}, (SELECT COALESCE(MAX(position), 0) + 1 FROM content.lessons))
    `;
  } catch (error) {
    if (isUniqueViolation(error)) return { error: e.lessonSlugTaken };
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
  const e = await errorMessages();
  const parsed = parseForForm(lessonSchema(e), input);
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
    if (isUniqueViolation(error)) return { error: e.lessonSlugTaken };
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

  const result = await compileLessonSource(source, (await getDictionary()).mdx);
  return "error" in result ? result : { compiledSource: result.compiledSource };
}

/** Like `parseForForm`, then also requires the body to compile. */
async function parseSublessonInput(
  input: unknown,
  dictionary: Dictionary,
): Promise<
  { error: string } | { data: z.infer<ReturnType<typeof sublessonSchema>> }
> {
  const parsed = parseForForm(sublessonSchema(dictionary.errors), input);
  if ("error" in parsed) return parsed;
  const compiled = await compileLessonSource(parsed.data.body, dictionary.mdx);
  if ("error" in compiled) {
    return {
      error: fill(dictionary.errors.contentInvalid, { error: compiled.error }),
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
  const dictionary = await getDictionary();
  const parsed = await parseSublessonInput(input, dictionary);
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
      return { error: dictionary.errors.sectionSlugTaken };
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
  const dictionary = await getDictionary();
  const parsed = await parseSublessonInput(input, dictionary);
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
      return { error: dictionary.errors.sectionSlugTaken };
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
    return { error: (await errorMessages()).reorderConflict };

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
    return { error: (await errorMessages()).reorderConflict };

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
  const e = await errorMessages();
  const parsed = parseForForm(userSchema(e), input);
  if ("error" in parsed) return parsed;
  const data = parsed.data;

  const existing = await getUserByEmail(data.email);
  if (existing) {
    return { error: e.emailTaken };
  }

  const guid = randomUUID();

  await sql`
    INSERT INTO users (guid, first_name, last_name, email, role, status, password_hash)
    VALUES (${guid}, ${data.firstName}, ${data.lastName}, ${data.email}, 'User', ${data.status}, NULL)
  `;

  const token = await createPasswordResetToken(guid);
  try {
    // The student hasn't picked a language yet, so write in the one the teacher uses.
    await sendSetPasswordEmail(
      data.email,
      data.firstName,
      token,
      await getLocale(),
      "invite",
    );
  } catch (error) {
    // Don't fail student creation over a flaky/unconfigured email provider — the
    // student record and a valid token both exist; log the link so it can be
    // shared manually while the issue is sorted out.
    console.error(`Failed to send set-password email to ${data.email}:`, error);
    console.error(`Set-password link: ${setPasswordLink(token)}`);
  }

  revalidatePath("/students");
  return { guid };
}

/**
 * "Forgot password?" flow. Always reports success, and does the lookup and
 * sending after the response, so neither the answer nor its timing reveals
 * which emails are registered.
 */
export async function requestPasswordReset(
  emailInput: string,
): Promise<{ success: true }> {
  const email = z.email().trim().toLowerCase().max(254).safeParse(emailInput);
  if (!email.success) return { success: true };

  const ip = clientIpFromHeaders(await headers());
  // Check both, so one doesn't skip counting the other.
  const byIp = checkResetRateLimitByIp(ip).allowed;
  const byEmail = checkResetRateLimitByEmail(email.data).allowed;
  if (!byIp || !byEmail) {
    console.warn(`Password reset rate-limited (ip ${ip}, email ${email.data})`);
    return { success: true };
  }

  const fallbackLocale = await getLocale();
  after(async () => {
    const user = await getUserByEmail(email.data);
    // Inactive users can't log in, so a new password would be no use to them.
    if (!user || user.status !== "Active") return;

    const token = await createPasswordResetToken(user.guid);
    try {
      await sendSetPasswordEmail(
        user.email,
        user.first_name,
        token,
        hasLocale(user.locale) ? user.locale : fallbackLocale,
        "reset",
      );
    } catch (error) {
      console.error(
        `Failed to send password reset email to ${user.email}:`,
        error,
      );
    }
  });

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
        fill((await errorMessages()).passwordTooShort, {
          min: PASSWORD_MIN_LENGTH,
        }),
      )
      .max(200),
    passwordInput,
  );
  if ("error" in password) return password;

  // Consuming the token in the same statement that checks it means it can only be used once.
  const [row] = await sql`
    DELETE FROM password_reset_tokens
    WHERE token = ${hashResetToken(token)} AND expires_at > now()
    RETURNING user_guid
  `;
  if (!row) {
    return { error: (await errorMessages()).linkExpired };
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
  const e = await errorMessages();
  const parsed = parseForForm(userSchema(e), input);
  if ("error" in parsed) return parsed;
  const data = parsed.data;

  const existing = await getUserByEmail(data.email);
  if (existing && existing.guid !== guid) {
    return { error: e.emailTaken };
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
  const parsed = parseForForm(announcementSchema(await errorMessages()), input);
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
  const parsed = parseForForm(announcementSchema(await errorMessages()), input);
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
  const parsed = parseForForm(blogPostSchema(await errorMessages()), input);
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
  const parsed = parseForForm(blogPostSchema(await errorMessages()), input);
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
    return { error: (await errorMessages()).uploadNotConfigured };
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

/**
 * Saves the language picked in the user menu for the signed-in user, so it
 * follows them to other devices and into their emails. The browser has already
 * written the shared `lang` cookie; revalidating re-renders the page in it.
 */
export async function saveLocale(localeInput: Locale): Promise<void> {
  if (!hasLocale(localeInput)) {
    throw new Error("Invalid input");
  }
  const user = await getCurrentUser();
  if (user) {
    await sql`UPDATE users SET locale = ${localeInput} WHERE guid = ${user.guid}`;
  }
  revalidatePath("/", "layout");
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
