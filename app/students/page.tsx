import { notFound } from "next/navigation";
import Link from "next/link";

import { auth } from "@/auth";
import { hasTeacherAccess } from "@/lib/utils";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateStudentDialog } from "@/components/students/create-student-dialog";
import { getStudents } from "@/lib/lessons";
import { getDictionary } from "@/lib/dictionary";
import { fill } from "@/lib/i18n";

export default async function StudentsPage() {
  const session = await auth();
  if (!hasTeacherAccess(session?.user?.role)) {
    notFound();
  }

  const [students, dictionary] = await Promise.all([
    getStudents(),
    getDictionary(),
  ]);
  const t = dictionary.students;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t.title}</h1>
        <CreateStudentDialog />
      </div>
      <div className="flex flex-col gap-4">
        {students.map((student) => (
          <Link key={student.guid} href={`/students/${student.guid}`}>
            <Card className="transition-colors hover:bg-muted">
              <CardHeader>
                <CardTitle>{student.firstName} {student.lastName}</CardTitle>
                <CardDescription>{student.email}</CardDescription>
                <CardDescription>
                  {fill(t.progress, {
                    unlocked: student.unlockedLessonCount,
                    lessons: student.totalLessonCount,
                    completed: student.completedSublessonCount,
                    sections: student.totalSublessonCount,
                  })}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
        {students.length === 0 && (
          <p className="text-sm text-muted-foreground">{t.empty}</p>
        )}
      </div>
    </div>
  );
}
