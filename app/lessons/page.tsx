import Link from "next/link";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLessons } from "@/lib/lessons";

export default function LessonsPage() {
  const lessons = getLessons();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">Lessons</h1>
      <div className="flex flex-col gap-4">
        {lessons.map((lesson) => (
          <Link key={lesson.slug} href={`/lessons/${lesson.slug}`}>
            <Card className="transition-colors hover:bg-muted">
              <CardHeader>
                <CardTitle>{lesson.title}</CardTitle>
                {lesson.description && <CardDescription>{lesson.description}</CardDescription>}
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
