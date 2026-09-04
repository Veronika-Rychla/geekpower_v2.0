import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Circle, Lock } from "lucide-react";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EditStudentDialog } from "@/components/students/edit-student-dialog";
import { unlockLesson } from "@/lib/actions";
import { getStudentDetail } from "@/lib/lessons";

function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function StudentDetailPage({
  params,
}: PageProps<"/students/[studentGuid]">) {
  const { studentGuid } = await params;

  const session = await auth();
  if (session?.user?.role !== "Admin") {
    notFound();
  }

  const detail = await getStudentDetail(studentGuid);
  if (!detail) {
    notFound();
  }

  const { student, lessons } = detail;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <div>
        <Link
          href="/students"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← All students
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{student.name}</h1>
            <p className="text-sm text-muted-foreground">
              {student.email} · {student.status}
            </p>
          </div>
          <EditStudentDialog
            guid={student.guid}
            name={student.name}
            email={student.email}
            status={student.status}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {lessons.map((lesson) => {
          const completedCount = lesson.sublessons.filter(
            (s) => s.completedAt,
          ).length;

          return (
            <Card key={lesson.slug}>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <CardTitle>{lesson.title}</CardTitle>
                  {!lesson.unlocked && (
                    <form
                      action={unlockLesson.bind(
                        null,
                        student.guid,
                        lesson.slug,
                      )}
                    >
                      <Button type="submit" size="sm" variant="outline">
                        Unlock
                      </Button>
                    </form>
                  )}
                </div>
                <CardDescription>
                  {lesson.unlocked ? (
                    <>
                      {completedCount} / {lesson.sublessons.length} sections
                      completed
                      {lesson.unlockedAt && (
                        <span className="text-xs text-muted-foreground">
                          {" "}
                          · Unlocked {formatDateTime(lesson.unlockedAt)}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Lock className="size-3.5" /> Locked
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              {lesson.unlocked && (
                <div className="flex flex-col gap-1.5 px-6 pb-6">
                  {lesson.sublessons.map((sublesson) => (
                    <div
                      key={sublesson.slug}
                      className="flex items-center gap-2 text-sm"
                    >
                      {sublesson.completedAt ? (
                        <CheckCircle2 className="size-3.5 shrink-0 text-green-500" />
                      ) : (
                        <Circle className="size-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <span
                        className={
                          sublesson.completedAt ? "" : "text-muted-foreground"
                        }
                      >
                        {sublesson.title}
                      </span>
                      {sublesson.completedAt && (
                        <span className="text-xs text-muted-foreground">
                          · {formatDateTime(sublesson.completedAt)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
