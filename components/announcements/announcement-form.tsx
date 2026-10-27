"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createAnnouncement, updateAnnouncement } from "@/lib/actions";

interface AnnouncementFields {
  title: string;
  body: string;
}

interface AnnouncementFormProps {
  /** When set, the form edits this announcement; otherwise it creates a new one. */
  guid?: string;
  defaultValues?: AnnouncementFields;
  onSuccess: () => void;
}

export function AnnouncementForm({ guid, defaultValues, onSuccess }: AnnouncementFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AnnouncementFields>({
    defaultValues: defaultValues ?? { title: "", body: "" },
  });

  const idPrefix = guid ? `announcement-${guid}` : "announcement-new";

  async function onSubmit(data: AnnouncementFields) {
    setFormError(null);
    const result = guid ? await updateAnnouncement(guid, data) : await createAnnouncement(data);

    if ("error" in result) {
      setFormError(result.error);
      return;
    }

    onSuccess();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{guid ? "Edit announcement" : "New announcement"}</DialogTitle>
      </DialogHeader>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-title`}>Title</Label>
          <Input
            id={`${idPrefix}-title`}
            aria-invalid={!!errors.title}
            {...register("title", {
              validate: (value) => value.trim().length > 0 || "Title is required",
              maxLength: { value: 200, message: "Title must be at most 200 characters" },
            })}
          />
          {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-body`}>Text</Label>
          <Textarea
            id={`${idPrefix}-body`}
            rows={6}
            className="max-h-80"
            aria-invalid={!!errors.body}
            {...register("body", {
              validate: (value) => value.trim().length > 0 || "Text is required",
            })}
          />
          {errors.body && <p className="text-sm text-destructive">{errors.body.message}</p>}
        </div>

        {formError && <p className="text-sm text-destructive">{formError}</p>}

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : guid ? "Save changes" : "Publish"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
