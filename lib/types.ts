// DB types

// public.users
export interface User {
  guid: string;
  first_name: string;
  last_name: string;
  email: string;
  role: "Admin" | "User";
  status: "Active" | "Inactive";
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
