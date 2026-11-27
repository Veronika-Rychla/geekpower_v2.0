import Link from "next/link";

import { getCurrentUser } from "@/lib/guards";
import { hasTeacherAccess } from "@/lib/utils";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LessonManager } from "@/components/lessons/manage/lesson-manager";
import { getLessons } from "@/lib/lessons";
import { getDictionary } from "@/lib/dictionary";
import { fill } from "@/lib/i18n";

export default async function LessonsPage() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }
  const [lessons, dictionary] = await Promise.all([
    getLessons(user),
    getDictionary(),
  ]);
  const t = dictionary.lessons;

  if (hasTeacherAccess(user.role)) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
        <LessonManager lessons={lessons} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">{t.title}</h1>
      <div className="flex flex-col gap-4">
        {lessons.map((lesson) => {
          const completedCount = lesson.sublessons.filter((s) => s.completedAt).length;

          return (
            <Link key={lesson.guid} href={`/lessons/${lesson.slug}`}>
              <Card className="transition-colors hover:bg-muted">
                <CardHeader>
                  <CardTitle>{lesson.displayTitle}</CardTitle>
                  <CardDescription>
                    {fill(t.completed, {
                      done: completedCount,
                      total: lesson.sublessons.length,
                    })}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
        {lessons.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {t.noneUnlocked}
          </p>
        )}
      </div>
    </div>
  );
}
