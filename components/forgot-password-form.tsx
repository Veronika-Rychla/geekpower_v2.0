"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/lib/actions";
import { useDictionary } from "@/components/i18n-provider";

interface ForgotPasswordFields {
  email: string;
}

export function ForgotPasswordForm() {
  const dictionary = useDictionary();
  const t = dictionary.forgotPassword;
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFields>();

  async function onSubmit(data: ForgotPasswordFields) {
    await requestPasswordReset(data.email);
    setSent(true);
  }

  if (sent) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">{t.sentTitle}</CardTitle>
          <CardDescription>{t.sentDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            {t.backToLogin}
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">{t.title}</CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">{dictionary.common.email}</Label>
            <Input
              id="email"
              type="email"
              placeholder={dictionary.common.emailPlaceholder}
              aria-invalid={!!errors.email}
              {...register("email", { required: t.emailRequired })}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
            {isSubmitting ? t.sending : t.submit}
          </Button>

          <Link
            href="/"
            className="text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {t.backToLogin}
          </Link>
        </form>
      </CardContent>
    </Card>
  );
}
