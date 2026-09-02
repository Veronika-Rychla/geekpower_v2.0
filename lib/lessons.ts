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
  role: "admin" | "user";
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
  const isAdmin = user.role === "admin";

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

  if (user.role !== "admin") {
    const unlockedSlugs = await getUnlockedLessonSlugs(user.guid);
    if (!unlockedSlugs.has(lessonSlug)) {
      return null;
    }
  }

  const completion = await getSublessonCompletion(user.guid);
  return buildLessonMeta(lessonSlug, completion);
});
