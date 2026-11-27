"use client";

import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreateStudentForm } from "@/components/students/create-student-form";
import { useDictionary } from "@/components/i18n-provider";

export function CreateStudentDialog() {
  const t = useDictionary().students;

  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" />}>{t.create}</DialogTrigger>
      <DialogContent>
        <CreateStudentForm />
      </DialogContent>
    </Dialog>
  );
}
