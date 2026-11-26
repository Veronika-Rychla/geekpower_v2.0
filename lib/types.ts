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

// content.lessons
// slug UNIQUE, CHECK ^[a-z0-9]+(-[a-z0-9]+)*$; position UNIQUE
export interface ContentLesson {
  guid: string; // default gen_random_uuid()
  slug: string;
  title: string; // 1–200 chars
  position: number; // display order
  is_draft: boolean; // default true; drafts are hidden from students
  created_at: Date; // timestamptz
  updated_at: Date | null; // timestamptz
}

// content.sublessons (a lesson's sections)
// UNIQUE (lesson_guid, slug); UNIQUE (lesson_guid, position)
export interface ContentSublesson {
  guid: string; // default gen_random_uuid()
  lesson_guid: string; // FK content.lessons ON DELETE CASCADE
  slug: string;
  title: string; // 1–200 chars
  body: string; // MDX, see lib/mdx/lesson-mdx.ts
  position: number;
  is_draft: boolean; // default true
  created_at: Date; // timestamptz
  updated_at: Date | null; // timestamptz
}

// progress.lessons: a lesson unlocked for a student. PK (user_guid, lesson_guid)
export interface ProgressLesson {
  user_guid: string; // FK users ON DELETE CASCADE
  lesson_guid: string; // FK content.lessons ON DELETE CASCADE
  unlocked_by: string | null; // FK users ON DELETE SET NULL
  unlocked_at: Date; // timestamptz
}

// progress.sublessons: a section a student finished. PK (user_guid, sublesson_guid)
export interface ProgressSublesson {
  user_guid: string; // FK users ON DELETE CASCADE
  sublesson_guid: string; // FK content.sublessons ON DELETE CASCADE
  completed_at: Date; // timestamptz
}

// progress.interactions: a student's answer to a quiz. PK (user_guid, sublesson_guid, interaction_id)
export interface ProgressInteraction {
  user_guid: string; // FK users ON DELETE CASCADE
  sublesson_guid: string; // FK content.sublessons ON DELETE CASCADE
  interaction_id: string; // the quiz id
  type: string; // quiz kind, e.g. "choice"
  response: unknown; // e.g. ChoiceQuizResponse from lib/quizzes.ts
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
  createdAt: string; // timestamptz
  updatedAt: string | null; // timestamptz
}

// public.contact_messages
export interface ContactFormMessage {
  guid: string;
  name: string;
  email: string;
  message: string;
  created_at: Date; // timestamptz
  resolved: boolean; // default false
}

export interface ContactMessage {
  guid: string;
  name: string;
  email: string;
  message: string;
  createdAt: string; // timestamptz
  resolved: boolean;
}

export const BLOG_POST_TYPES = [
  "Vocabulary",
  "Meetings",
  "Career",
  "Study skills",
  "Opinion",
] as const;
export type BlogPostType = (typeof BLOG_POST_TYPES)[number];

// public.blog_posts
export interface BlogPost {
  guid: string;
  title: string;
  summary: string;
  message: string;
  type: BlogPostType[];
  is_draft: boolean;
  read_time: number; // minutes
  author_guid: string;
  created_at: Date; // timestamptz
  updated_at: Date | null; // timestamptz
}

export interface BlogMessage {
  guid: string;
  title: string;
  summary: string;
  message: string;
  type: BlogPostType[];
  isDraft: boolean;
  readTime: number; // minutes
  authorName: string;
  createdAt: string; // timestamptz
  updatedAt: string | null; // timestamptz
}
