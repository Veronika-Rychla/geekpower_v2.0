import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
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
