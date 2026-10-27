// DB types

export type Role = "Admin" | "Teacher" | "User";

// public.users
export interface User {
  guid: string;
  first_name: string;
  last_name: string;
  email: string;
  role: Role;
  status: "Active" | "Inactive";
  password_hash: string | null;
}

// progress.lessons
export interface ProgressLesson {
  user_guid: string;
  lesson_slug: string;
  unlocked_by?: string;
  unlocked_at?: Date; // timestamptz
}

// progress.sublessons
export interface ProgressSublesson {
  user_guid: string;
  lesson_slug: string;
  sublesson_slug: string;
  completed_at?: Date; // timestamptz
  last_position?: string;
}

// progress.interactions
export interface ProgressInteraction {
  user_guid: string;
  lesson_slug: string;
  sublesson_slug: string;
  interaction_id: string;
  type: string;
  response: unknown;
  completed_at: Date; // timestamptz
}

// public.password_reset_tokens
export interface PasswordResetToken {
  token: string;
  user_guid: string;
  expires_at: Date; // timestamptz
  created_at: Date; // timestamptz
}

export const ANNOUNCEMENT_TYPES = ["Announcement", "Update"] as const;
export type AnnouncementType = (typeof ANNOUNCEMENT_TYPES)[number];

// public.announcements
export interface Announcement {
  guid: string;
  type: AnnouncementType;
  title: string;
  body: string;
  author_guid: string;
  created_at: Date; // timestamptz
  updated_at: Date | null; // timestamptz
}

export interface AnnouncementView {
  guid: string;
  type: AnnouncementType;
  title: string;
  body: string;
  authorName: string;
  createdAt: string;
  updatedAt: string | null;
}
