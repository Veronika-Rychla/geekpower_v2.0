"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateUser } from "@/lib/actions";

interface EditUserFields {
  firstName: string;
  lastName: string;
  email: string;
  status: "Active" | "Inactive";
}

interface EditUserFormProps {
  guid: string;
  defaultValues: { firstName: string; lastName: string; email: string; status: "Active" | "Inactive" };
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
          <Label htmlFor="edit-first-name">First name</Label>
          <Input
            id="edit-first-name"
            placeholder="Jane"
            aria-invalid={!!errors.firstName}
            {...register("firstName", { required: "First name is required" })}
          />
          {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-last-name">Last name</Label>
          <Input
            id="edit-last-name"
            placeholder="Smith"
            aria-invalid={!!errors.lastName}
            {...register("lastName", { required: "Last name is required" })}
          />
          {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
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
