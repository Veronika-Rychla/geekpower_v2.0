"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { EditUserForm } from "@/components/students/edit-user-form";

interface EditStudentDialogProps {
  guid: string;
  firstName: string;
  lastName: string;
  email: string;
  status: "Active" | "Inactive";
}

export function EditStudentDialog({ guid, firstName, lastName, email, status }: EditStudentDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Pencil className="size-3.5" />
        Edit
      </DialogTrigger>
      <DialogContent>
        <EditUserForm
          guid={guid}
          defaultValues={{ firstName, lastName, email, status }}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
