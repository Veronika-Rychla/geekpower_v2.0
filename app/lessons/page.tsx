import Link from "next/link";

import { auth } from "@/auth";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLessons } from "@/lib/lessons";

export default async function LessonsPage() {
  const session = await auth();
  if (!session?.user?.guid || !session.user.role) {
    return null;
  }
  const lessons = await getLessons({ guid: session.user.guid, role: session.user.role });
  const isAdmin = session.user.role === "admin";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">Lessons</h1>
      <div className="flex flex-col gap-4">
        {lessons.map((lesson) => {
          const completedCount = lesson.sublessons.filter((s) => s.completedAt).length;

          return (
            <Link key={lesson.slug} href={`/lessons/${lesson.slug}`}>
              <Card className="transition-colors hover:bg-muted">
                <CardHeader>
                  <CardTitle>{lesson.title}</CardTitle>
                  {!isAdmin && (
                    <CardDescription>
                      {completedCount} / {lesson.sublessons.length} completed
                    </CardDescription>
                  )}
                </CardHeader>
              </Card>
            </Link>
          );
        })}
        {lessons.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No lessons unlocked yet — ask your teacher for access.
          </p>
        )}
      </div>
    </div>
  );
}
