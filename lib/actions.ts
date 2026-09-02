"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { sql } from "@/app/database";

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
