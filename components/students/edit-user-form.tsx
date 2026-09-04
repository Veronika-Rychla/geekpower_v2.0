"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateUser } from "@/lib/actions";

interface EditUserFields {
  name: string;
  email: string;
  status: "Active" | "Inactive";
}

interface EditUserFormProps {
  guid: string;
  defaultValues: { name: string; email: string; status: "Active" | "Inactive" };
  onSuccess: () => void;
}

export function EditUserForm({ guid, defaultValues, onSuccess }: EditUserFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditUserFields>({
    defaultValues,
  });

  async function onSubmit(data: EditUserFields) {
    setFormError(null);
    const result = await updateUser(guid, data);

    if ("error" in result) {
      setFormError(result.error);
      return;
    }

    onSuccess();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit student</DialogTitle>
      </DialogHeader>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-name">Name</Label>
          <Input
            id="edit-name"
            placeholder="Jane Smith"
            aria-invalid={!!errors.name}
            {...register("name", { required: "Name is required" })}
          />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-email">Email</Label>
          <Input
            id="edit-email"
            type="email"
            placeholder="jane@example.com"
            aria-invalid={!!errors.email}
            {...register("email", {
              required: "Email is required",
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email address" },
            })}
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-status">Status</Label>
          <select
            id="edit-status"
            className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
            {...register("status", { required: true })}
          >
            <option value="Active" className="bg-popover text-popover-foreground">
              Active
            </option>
            <option value="Inactive" className="bg-popover text-popover-foreground">
              Inactive
            </option>
          </select>
        </div>

        {formError && <p className="text-sm text-destructive">{formError}</p>}

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
