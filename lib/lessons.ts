import "server-only";

import { cache } from "react";

import { sql } from "@/app/database";
import { toIsoOrNull } from "@/lib/dates";
import type { Role } from "@/lib/types";
import { hasTeacherAccess } from "@/lib/utils";

/*
 * Lessons and their sections (sublessons) live in content.lessons and
 * content.sublessons, ordered by `position`. Drafts are visible to teachers
 * only; students see published sections of published lessons they've been
 * unlocked.
 */

export interface SublessonMeta {
  guid: string;
  slug: string;
  title: string;
  /** "01 - Title" for published sections, the bare title for drafts. */
  displayTitle: string;
  isDraft: boolean;
  completedAt: string | null;
}

export interface LessonMeta {
  guid: string;
  slug: string;
  title: string;
  /** "01 - Title" for published lessons, the bare title for drafts. */
  displayTitle: string;
  isDraft: boolean;
  sublessons: SublessonMeta[];
}

interface AccessUser {
  guid: string;
  role: Role;
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

interface ContentRow {
  guid: string;
  slug: string;
  title: string;
  is_draft: boolean;
}

interface SublessonRow extends ContentRow {
  lesson_guid: string;
}

/** Numbers published items 1, 2, 3… in order; drafts don't take a number, so students never see gaps. */
function withDisplayTitles<T extends ContentRow>(rows: T[]): (T & { displayTitle: string })[] {
  let number = 0;
  return rows.map((row) => ({
    ...row,
    displayTitle: row.is_draft ? row.title : `${String(++number).padStart(2, "0")} - ${row.title}`,
  }));
}

async function loadCatalog(includeDrafts: boolean, completion: Map<string, string | null>): Promise<LessonMeta[]> {
  const [lessonRows, sublessonRows] = (await Promise.all([
    sql`
      SELECT guid, slug, title, is_draft FROM content.lessons
      WHERE ${includeDrafts} OR NOT is_draft
      ORDER BY position
    `,
    sql`
      SELECT guid, lesson_guid, slug, title, is_draft FROM content.sublessons
      WHERE ${includeDrafts} OR NOT is_draft
      ORDER BY position
    `,
  ])) as [ContentRow[], SublessonRow[]];

  return withDisplayTitles(lessonRows).map((lesson) => ({
    guid: lesson.guid,
    slug: lesson.slug,
    title: lesson.title,
    displayTitle: lesson.displayTitle,
    isDraft: lesson.is_draft,
    sublessons: withDisplayTitles(sublessonRows.filter((row) => row.lesson_guid === lesson.guid)).map((row) => ({
      guid: row.guid,
      slug: row.slug,
      title: row.title,
      displayTitle: row.displayTitle,
      isDraft: row.is_draft,
      completedAt: completion.get(row.guid) ?? null,
    })),
  }));
}

async function getUnlockedLessons(userGuid: string): Promise<Map<string, string | null>> {
  const rows = await sql`SELECT lesson_guid, unlocked_at FROM progress.lessons WHERE user_guid = ${userGuid}`;
  return new Map(rows.map((row) => [row.lesson_guid as string, toIsoOrNull(row.unlocked_at)]));
}

/** Completed sections of this user, by sublesson guid. */
async function getSublessonCompletion(userGuid: string): Promise<Map<string, string | null>> {
  const rows = await sql`SELECT sublesson_guid, completed_at FROM progress.sublessons WHERE user_guid = ${userGuid}`;
  return new Map(rows.map((row) => [row.sublesson_guid as string, toIsoOrNull(row.completed_at)]));
}

/**
 * Lessons visible to this user: all of them (drafts included) for teachers,
 * only published, unlocked ones otherwise. Cached per request; pass the
 * object from `getCurrentUser()` so callers share the cache entry.
 */
export const getLessons = cache(async (user: AccessUser): Promise<LessonMeta[]> => {
  if (hasTeacherAccess(user.role)) {
    return loadCatalog(true, await getSublessonCompletion(user.guid));
  }

  const [unlocked, completion] = await Promise.all([
    getUnlockedLessons(user.guid),
    getSublessonCompletion(user.guid),
  ]);
  const lessons = await loadCatalog(false, completion);
  return lessons.filter((lesson) => unlocked.has(lesson.guid));
});

/** A single lesson, or null if it doesn't exist or this user can't access it. */
export async function getLesson(user: AccessUser, lessonSlug: string): Promise<LessonMeta | null> {
  const lessons = await getLessons(user);
  return lessons.find((lesson) => lesson.slug === lessonSlug) ?? null;
}

/** A section's MDX source. Check access first (e.g. via `getLesson`). */
export async function getSublessonBody(sublessonGuid: string): Promise<string | null> {
  const [row] = await sql`SELECT body FROM content.sublessons WHERE guid = ${sublessonGuid}`;
  return row ? (row.body as string) : null;
}

export interface AccessibleSublesson {
  guid: string;
  slug: string;
  body: string;
  lessonSlug: string;
}

/** A section with its source, or null if it doesn't exist or this user can't access it. For server actions. */
export async function getAccessibleSublesson(
  user: AccessUser,
  sublessonGuid: string,
): Promise<AccessibleSublesson | null> {
  const isTeacher = hasTeacherAccess(user.role);
  const [row] = await sql`
    SELECT s.guid, s.slug, s.body, l.slug AS lesson_slug
    FROM content.sublessons s
    JOIN content.lessons l ON l.guid = s.lesson_guid
    WHERE s.guid = ${sublessonGuid}
      AND (
        ${isTeacher}
        OR (
          NOT s.is_draft AND NOT l.is_draft
          AND EXISTS (SELECT 1 FROM progress.lessons p WHERE p.user_guid = ${user.guid} AND p.lesson_guid = l.guid)
        )
      )
  `;
  if (!row) {
    return null;
  }
  return {
    guid: row.guid as string,
    slug: row.slug as string,
    body: row.body as string,
    lessonSlug: row.lesson_slug as string,
  };
}

/** This user's saved responses for every interactive block in a section, keyed by interaction id. */
export async function getInteractions(
  userGuid: string,
  sublessonGuid: string,
): Promise<Record<string, { type: string; response: unknown }>> {
  const rows = await sql`
    SELECT interaction_id, type, response
    FROM progress.interactions
    WHERE user_guid = ${userGuid} AND sublesson_guid = ${sublessonGuid}
  `;
  return Object.fromEntries(
    rows.map((row) => [row.interaction_id as string, { type: row.type as string, response: row.response }]),
  );
}

// --- Editing (teachers) ---

export interface LessonSummary {
  guid: string;
  slug: string;
  title: string;
}

export async function getLessonSummary(lessonGuid: string): Promise<LessonSummary | null> {
  const [row] = await sql`SELECT guid, slug, title FROM content.lessons WHERE guid = ${lessonGuid}`;
  return row ? { guid: row.guid as string, slug: row.slug as string, title: row.title as string } : null;
}

export interface EditableSublesson {
  guid: string;
  lesson: LessonSummary;
  slug: string;
  title: string;
  body: string;
  isDraft: boolean;
}

export async function getEditableSublesson(sublessonGuid: string): Promise<EditableSublesson | null> {
  const [row] = await sql`
    SELECT s.guid, s.slug, s.title, s.body, s.is_draft,
           l.guid AS lesson_guid, l.slug AS lesson_slug, l.title AS lesson_title
    FROM content.sublessons s
    JOIN content.lessons l ON l.guid = s.lesson_guid
    WHERE s.guid = ${sublessonGuid}
  `;
  if (!row) {
    return null;
  }
  return {
    guid: row.guid as string,
    lesson: { guid: row.lesson_guid as string, slug: row.lesson_slug as string, title: row.lesson_title as string },
    slug: row.slug as string,
    title: row.title as string,
    body: row.body as string,
    isDraft: row.is_draft as boolean,
  };
}

// --- Students (teacher views) ---

/** All students (role "User"), with unlocked-lesson and completed-section counts over published content. */
export async function getStudents(): Promise<StudentSummary[]> {
  const [users, unlockedRows, completedRows, [totals]] = await Promise.all([
    sql`SELECT guid, first_name, last_name, email FROM users WHERE role = 'User' ORDER BY first_name, last_name`,
    sql`
      SELECT p.user_guid, COUNT(*)::int AS count
      FROM progress.lessons p
      JOIN content.lessons l ON l.guid = p.lesson_guid AND NOT l.is_draft
      GROUP BY p.user_guid
    `,
    sql`
      SELECT p.user_guid, COUNT(*)::int AS count
      FROM progress.sublessons p
      JOIN content.sublessons s ON s.guid = p.sublesson_guid AND NOT s.is_draft
      JOIN content.lessons l ON l.guid = s.lesson_guid AND NOT l.is_draft
      GROUP BY p.user_guid
    `,
    sql`
      SELECT
        (SELECT COUNT(*)::int FROM content.lessons WHERE NOT is_draft) AS lessons,
        (SELECT COUNT(*)::int FROM content.sublessons s
           JOIN content.lessons l ON l.guid = s.lesson_guid
           WHERE NOT s.is_draft AND NOT l.is_draft) AS sublessons
    `,
  ]);

  const unlockedByUser = new Map(unlockedRows.map((row) => [row.user_guid as string, row.count as number]));
  const completedByUser = new Map(completedRows.map((row) => [row.user_guid as string, row.count as number]));

  return (users as { guid: string; first_name: string; last_name: string; email: string }[]).map((student) => ({
    guid: student.guid,
    firstName: student.first_name,
    lastName: student.last_name,
    email: student.email,
    unlockedLessonCount: unlockedByUser.get(student.guid) ?? 0,
    totalLessonCount: totals.lessons as number,
    completedSublessonCount: completedByUser.get(student.guid) ?? 0,
    totalSublessonCount: totals.sublessons as number,
  }));
}

/** One student's breakdown of every published lesson (locked and unlocked), for the student detail page. */
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

  const [unlocked, completion] = await Promise.all([
    getUnlockedLessons(studentGuid),
    getSublessonCompletion(studentGuid),
  ]);
  const lessons = (await loadCatalog(false, completion)).map((lesson) => ({
    ...lesson,
    unlocked: unlocked.has(lesson.guid),
    unlockedAt: unlocked.get(lesson.guid) ?? null,
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
