import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Role } from "@/lib/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Admins and Teachers see everything (all lessons, students); Users only their own progress. */
export function hasAdminAccess(role: Role | undefined): boolean {
  return role === "Admin" || role === "Teacher"
}
