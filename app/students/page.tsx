import { notFound } from "next/navigation";
import Link from "next/link";

import { auth } from "@/auth";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateStudentDialog } from "@/components/students/create-student-dialog";
import { getStudents } from "@/lib/lessons";

export default async function StudentsPage() {
  const session = await auth();
  if (session?.user?.role !== "Admin") {
    notFound();
  }

  const students = await getStudents();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Students</h1>
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
                  {student.unlockedLessonCount} / {student.totalLessonCount} lessons unlocked ·{" "}
                  {student.completedSublessonCount} / {student.totalSublessonCount} sections completed
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
        {students.length === 0 && (
          <p className="text-sm text-muted-foreground">No students yet.</p>
        )}
      </div>
    </div>
  );
}
