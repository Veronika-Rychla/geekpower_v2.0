"use client";

import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreateStudentForm } from "@/components/students/create-student-form";

export function CreateStudentDialog() {
  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" />}>Create student</DialogTrigger>
      <DialogContent>
        <CreateStudentForm />
      </DialogContent>
    </Dialog>
  );
}
