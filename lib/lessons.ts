import fs from "node:fs";
import path from "node:path";
import { cache } from "react";

import { sql } from "@/app/database";

const LESSONS_DIR = path.join(process.cwd(), "content", "lessons");

export interface SublessonMeta {
  slug: string;
  title: string;
  completedAt: string | null;
}

export interface LessonMeta {
  slug: string;
  title: string;
  sublessons: SublessonMeta[];
}

interface AccessUser {
  guid: string;
  role: "Admin" | "User";
}

export interface StudentSummary {
  guid: string;
  firstName: string;
  lastName: string;
  email: string;
  unlockedLessonCount: number;
  totalLessonCount: number;
  completedSublessonCount: number;
  totalSublessonCount: number;
}

export interface StudentLessonDetail extends LessonMeta {
  unlocked: boolean;
  unlockedAt: string | null;
}

function titleFromSlug(slug: string): string {
  const withoutOrderPrefix = slug.replace(/^\d+-/, "");
  return withoutOrderPrefix
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function titleFromContent(source: string, fallback: string): string {
  const match = source.match(/^#{1,6}\s+(.+)$/m);
  return match ? match[1].trim() : fallback;
}

function listLessonSlugs(): string[] {
  return fs
    .readdirSync(LESSONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function listSublessonSlugs(lessonSlug: string): string[] {
  return fs
    .readdirSync(path.join(LESSONS_DIR, lessonSlug))
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.replace(/\.md$/, ""))
    .sort();
}

export function getSublessonSource(lessonSlug: string, sublessonSlug: string): string {
  return fs.readFileSync(path.join(LESSONS_DIR, lessonSlug, `${sublessonSlug}.md`), "utf8");
}

async function getUnlockedLessonSlugs(userGuid: string): Promise<Set<string>> {
  const rows = await sql`
    SELECT lesson_slug FROM progress.lessons WHERE user_guid = ${userGuid}
  `;
  return new Set(rows.map((row) => row.lesson_slug as string));
}

async function getSublessonCompletion(userGuid: string): Promise<Map<string, string | null>> {
  const rows = await sql`
    SELECT lesson_slug, sublesson_slug, completed_at
    FROM progress.sublessons
    WHERE user_guid = ${userGuid}
  `;
  return new Map(
    rows.map((row) => [`${row.lesson_slug}/${row.sublesson_slug}`, row.completed_at as string | null]),
  );
}

function buildLessonMeta(
  lessonSlug: string,
  completion: Map<string, string | null>,
): LessonMeta {
  return {
    slug: lessonSlug,
    title: titleFromSlug(lessonSlug),
    sublessons: listSublessonSlugs(lessonSlug).map((sublessonSlug) => {
      const source = getSublessonSource(lessonSlug, sublessonSlug);
      return {
        slug: sublessonSlug,
        title: titleFromContent(source, titleFromSlug(sublessonSlug)),
        completedAt: completion.get(`${lessonSlug}/${sublessonSlug}`) ?? null,
      };
    }),
  };
}

/** Lessons visible to this user: all of them for an admin, only unlocked ones otherwise. */
export async function getLessons(user: AccessUser): Promise<LessonMeta[]> {
  const allSlugs = listLessonSlugs();
  const isAdmin = user.role === "Admin";

  const [unlockedSlugs, completion] = await Promise.all([
    isAdmin ? Promise.resolve(new Set(allSlugs)) : getUnlockedLessonSlugs(user.guid),
    getSublessonCompletion(user.guid),
  ]);

  const visibleSlugs = isAdmin ? allSlugs : allSlugs.filter((slug) => unlockedSlugs.has(slug));

  return visibleSlugs.map((lessonSlug) => buildLessonMeta(lessonSlug, completion));
}

/**
 * A single lesson, or null if it doesn't exist or this user can't access it.
 * Wrapped in `cache()` so the lesson layout and its page/content route
 * (which both need this for the same request) don't each hit fs + DB.
 */
export const getLesson = cache(async (user: AccessUser, lessonSlug: string): Promise<LessonMeta | null> => {
  if (!listLessonSlugs().includes(lessonSlug)) {
    return null;
  }

  if (user.role !== "Admin") {
    const unlockedSlugs = await getUnlockedLessonSlugs(user.guid);
    if (!unlockedSlugs.has(lessonSlug)) {
      return null;
    }
  }

  const completion = await getSublessonCompletion(user.guid);
  return buildLessonMeta(lessonSlug, completion);
});

function getTotalSublessonCount(): number {
  return listLessonSlugs().reduce((sum, slug) => sum + listSublessonSlugs(slug).length, 0);
}

/** All students (role "User"), with unlocked-lesson and completed-sublesson counts. For admin use. */
export async function getStudents(): Promise<StudentSummary[]> {
  const [users, unlockedRows, completedRows] = await Promise.all([
    sql`SELECT guid, first_name, last_name, email FROM users WHERE role = 'User' ORDER BY first_name, last_name`,
    sql`SELECT user_guid, COUNT(*)::int AS count FROM progress.lessons GROUP BY user_guid`,
    sql`
      SELECT user_guid, COUNT(*)::int AS count FROM progress.sublessons
      WHERE completed_at IS NOT NULL
      GROUP BY user_guid
    `,
  ]);

  const unlockedByUser = new Map(unlockedRows.map((row) => [row.user_guid as string, row.count as number]));
  const completedByUser = new Map(completedRows.map((row) => [row.user_guid as string, row.count as number]));

  const totalLessonCount = listLessonSlugs().length;
  const totalSublessonCount = getTotalSublessonCount();

  return (users as { guid: string; first_name: string; last_name: string; email: string }[]).map((student) => ({
    guid: student.guid,
    firstName: student.first_name,
    lastName: student.last_name,
    email: student.email,
    unlockedLessonCount: unlockedByUser.get(student.guid) ?? 0,
    totalLessonCount,
    completedSublessonCount: completedByUser.get(student.guid) ?? 0,
    totalSublessonCount,
  }));
}

/** One student's full lesson breakdown (locked and unlocked), for the admin detail page. */
export async function getStudentDetail(studentGuid: string): Promise<{
  student: { guid: string; firstName: string; lastName: string; email: string; status: "Active" | "Inactive" };
  lessons: StudentLessonDetail[];
} | null> {
  const [student] = await sql`
    SELECT guid, first_name, last_name, email, status FROM users WHERE guid = ${studentGuid} AND role = 'User'
  `;
  if (!student) {
    return null;
  }

  const [unlockedRows, completion] = await Promise.all([
    sql`SELECT lesson_slug, unlocked_at FROM progress.lessons WHERE user_guid = ${studentGuid}`,
    getSublessonCompletion(studentGuid),
  ]);
  const unlockedByLesson = new Map(
    unlockedRows.map((row) => [row.lesson_slug as string, row.unlocked_at as string]),
  );

  const lessons = listLessonSlugs().map((lessonSlug) => ({
    ...buildLessonMeta(lessonSlug, completion),
    unlocked: unlockedByLesson.has(lessonSlug),
    unlockedAt: unlockedByLesson.get(lessonSlug) ?? null,
  }));

  const row = student as { guid: string; first_name: string; last_name: string; email: string; status: "Active" | "Inactive" };
  return {
    student: {
      guid: row.guid,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      status: row.status,
    },
    lessons,
  };
}
