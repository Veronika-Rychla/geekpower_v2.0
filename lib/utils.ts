import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { DateTime } from "luxon";
import type { Role } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Admins see everything */
export function hasAdminAccess(role: Role | undefined): boolean {
  return role === "Admin";
}

/** Admins and Teachers see (all lessons, students); Users only their own progress. */
export function hasTeacherAccess(role: Role | undefined): boolean {
  return hasAdminAccess(role) || role === "Teacher";
}

export function formatDateTime(isoString: string): string {
  return DateTime.fromISO(isoString)
    .setLocale("cs-CZ")
    .toLocaleString(DateTime.DATETIME_MED);
}

const READING_WORDS_PER_MINUTE = 200;

/** Estimated reading time in whole minutes (at least 1). */
export function estimateReadTime(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / READING_WORDS_PER_MINUTE));
}
