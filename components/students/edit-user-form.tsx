"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDictionary } from "@/components/i18n-provider";
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
  const dictionary = useDictionary();
  const { common } = dictionary;
  const t = dictionary.students;
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
        <DialogTitle>{t.editTitle}</DialogTitle>
      </DialogHeader>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-first-name">{t.firstName}</Label>
          <Input
            id="edit-first-name"
            placeholder={t.firstNamePlaceholder}
            aria-invalid={!!errors.firstName}
            {...register("firstName", { required: t.firstNameRequired })}
          />
          {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-last-name">{t.lastName}</Label>
          <Input
            id="edit-last-name"
            placeholder={t.lastNamePlaceholder}
            aria-invalid={!!errors.lastName}
            {...register("lastName", { required: t.lastNameRequired })}
          />
          {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-email">{common.email}</Label>
          <Input
            id="edit-email"
            type="email"
            placeholder={t.emailPlaceholder}
            aria-invalid={!!errors.email}
            {...register("email", {
              required: t.emailRequired,
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: t.emailInvalid },
            })}
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-status">{t.status}</Label>
          <select
            id="edit-status"
            className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
            {...register("status", { required: true })}
          >
            <option value="Active" className="bg-popover text-popover-foreground">
              {t.statuses.Active}
            </option>
            <option value="Inactive" className="bg-popover text-popover-foreground">
              {t.statuses.Inactive}
            </option>
          </select>
        </div>

        {formError && <p className="text-sm text-destructive">{formError}</p>}

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>{common.cancel}</DialogClose>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? common.saving : common.saveChanges}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
