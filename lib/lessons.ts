import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const LESSONS_DIR = path.join(process.cwd(), "content", "lessons");

export interface LessonMeta {
  slug: string;
  title: string;
  description?: string;
}

export function getLessons(): LessonMeta[] {
  const files = fs.readdirSync(LESSONS_DIR).filter((file) => file.endsWith(".mdx"));

  return files.map((file) => {
    const slug = file.replace(/\.mdx$/, "");
    const raw = fs.readFileSync(path.join(LESSONS_DIR, file), "utf8");
    const { data } = matter(raw);

    return {
      slug,
      title: (data.title as string | undefined) ?? slug,
      description: data.description as string | undefined,
    };
  });
}

export function getLessonSource(slug: string): string {
  return fs.readFileSync(path.join(LESSONS_DIR, `${slug}.mdx`), "utf8");
}
