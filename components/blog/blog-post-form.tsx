"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createBlogPost, updateBlogPost } from "@/lib/actions";
import { BLOG_POST_TYPES, type BlogPostType } from "@/lib/types";

export interface BlogPostFields {
  title: string;
  summary: string;
  message: string;
  type: BlogPostType[];
  isDraft: boolean;
}

interface BlogPostFormProps {
  /** When set, the form edits this post; otherwise it creates a new one. */
  guid?: string;
  defaultValues?: BlogPostFields;
  onSuccess: () => void;
}

export function BlogPostForm({
  guid,
  defaultValues,
  onSuccess,
}: BlogPostFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BlogPostFields>({
    defaultValues: defaultValues ?? {
      title: "",
      summary: "",
      message: "",
      type: [],
      isDraft: false,
    },
  });

  const idPrefix = guid ? `blog-${guid}` : "blog-new";

  async function onSubmit(data: BlogPostFields) {
    setFormError(null);
    const result = guid
      ? await updateBlogPost(guid, data)
      : await createBlogPost(data);

    if ("error" in result) {
      setFormError(result.error);
      return;
    }

    onSuccess();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{guid ? "Edit blog post" : "New blog post"}</DialogTitle>
      </DialogHeader>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-title`}>Title</Label>
          <Input
            id={`${idPrefix}-title`}
            aria-invalid={!!errors.title}
            {...register("title", {
              validate: (value) =>
                value.trim().length > 0 || "Title is required",
              maxLength: {
                value: 200,
                message: "Title must be at most 200 characters",
              },
            })}
          />
          {errors.title && (
            <p className="text-sm text-destructive">{errors.title.message}</p>
          )}
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm leading-none font-medium">
            Type
          </legend>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {BLOG_POST_TYPES.map((type) => (
              <label key={type} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  value={type}
                  className="size-4 accent-primary"
                  {...register("type", {
                    validate: (value) =>
                      value.length > 0 || "Pick at least one type",
                  })}
                />
                {type}
              </label>
            ))}
          </div>
          {errors.type && (
            <p className="text-sm text-destructive">{errors.type.message}</p>
          )}
        </fieldset>

        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-summary`}>Summary</Label>
          <Textarea
            id={`${idPrefix}-summary`}
            rows={2}
            aria-invalid={!!errors.summary}
            {...register("summary", {
              validate: (value) =>
                value.trim().length > 0 || "Summary is required",
              maxLength: {
                value: 1000,
                message: "Summary must be at most 1000 characters",
              },
            })}
          />
          {errors.summary && (
            <p className="text-sm text-destructive">{errors.summary.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-message`}>Message</Label>
          <Textarea
            id={`${idPrefix}-message`}
            rows={8}
            className="max-h-80"
            aria-invalid={!!errors.message}
            {...register("message", {
              validate: (value) =>
                value.trim().length > 0 || "Message is required",
            })}
          />
          {errors.message && (
            <p className="text-sm text-destructive">{errors.message.message}</p>
          )}
        </div>

        <label className="flex items-center gap-1.5 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            {...register("isDraft")}
          />
          Draft (hidden from students)
        </label>

        {formError && <p className="text-sm text-destructive">{formError}</p>}

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            Cancel
          </DialogClose>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : guid ? "Save changes" : "Save"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
