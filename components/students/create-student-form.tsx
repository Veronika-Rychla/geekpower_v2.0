"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDictionary } from "@/components/i18n-provider";
import { createStudent } from "@/lib/actions";

interface CreateStudentFields {
  firstName: string;
  lastName: string;
  email: string;
  status: "Active" | "Inactive";
}

export function CreateStudentForm() {
  const router = useRouter();
  const dictionary = useDictionary();
  const { common } = dictionary;
  const t = dictionary.students;
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateStudentFields>({ defaultValues: { status: "Active" } });

  async function onSubmit(data: CreateStudentFields) {
    setFormError(null);
    const result = await createStudent(data);

    if ("error" in result) {
      setFormError(result.error);
      return;
    }

    router.push(`/students/${result.guid}`);
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t.create}</DialogTitle>
      </DialogHeader>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="firstName">{t.firstName}</Label>
          <Input
            id="firstName"
            placeholder={t.firstNamePlaceholder}
            aria-invalid={!!errors.firstName}
            {...register("firstName", { required: t.firstNameRequired })}
          />
          {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="lastName">{t.lastName}</Label>
          <Input
            id="lastName"
            placeholder={t.lastNamePlaceholder}
            aria-invalid={!!errors.lastName}
            {...register("lastName", { required: t.lastNameRequired })}
          />
          {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="email">{common.email}</Label>
          <Input
            id="email"
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
          <Label htmlFor="status">{t.status}</Label>
          <select
            id="status"
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
            {isSubmitting ? t.creating : t.create}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
