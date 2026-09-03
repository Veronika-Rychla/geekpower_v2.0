import { notFound } from "next/navigation";
import Link from "next/link";

import { auth } from "@/auth";
import { CreateStudentForm } from "@/components/students/create-student-form";

export default async function NewStudentPage() {
  const session = await auth();
  if (session?.user?.role !== "Admin") {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center gap-6 px-6 py-16">
      <div className="w-full max-w-sm">
        <Link href="/students" className="text-xs text-muted-foreground hover:text-foreground">
          ← All students
        </Link>
      </div>
      <CreateStudentForm />
    </div>
  );
}
