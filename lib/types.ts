// DB types

// public.users
export interface User {
  guid: string;
  name: string;
  email: string;
  role: "admin" | "user";
  password_hash: string;
}

// progress.lessons
export interface ProgressLesson {
  user_guid: string;
  lesson_slug: string;
  unlocked_by?: string;
  unlocked_at?: string; // timestamp
}

// progress.sublessons
export interface ProgressSublesson {
  user_guid: string;
  lesson_slug: string;
  sublesson_slug: string;
  completed_at?: string; // timestamp
  last_position?: string;
}
