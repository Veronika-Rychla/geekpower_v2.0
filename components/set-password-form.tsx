"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { setPassword } from "@/lib/actions";
import { useDictionary } from "@/components/i18n-provider";
import { fill } from "@/lib/i18n";

const PASSWORD_MIN_LENGTH = 8;

interface SetPasswordFields {
  password: string;
  confirmPassword: string;
}

export function SetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const dictionary = useDictionary();
  const t = dictionary.setPassword;
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<SetPasswordFields>();

  async function onSubmit(data: SetPasswordFields) {
    setFormError(null);

    const result = await setPassword(token, data.password);

    if ("error" in result) {
      setFormError(result.error);
      return;
    }

    setDone(true);
  }

  if (done) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">{t.doneTitle}</CardTitle>
          <CardDescription>{t.doneDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={() => router.push("/")}>
            {t.goToLogin}
          </Button>
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
            <Label htmlFor="password">{t.newPassword}</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              aria-invalid={!!errors.password}
              {...register("password", {
                required: t.passwordRequired,
                minLength: {
                  value: PASSWORD_MIN_LENGTH,
                  message: fill(t.passwordTooShort, { min: PASSWORD_MIN_LENGTH }),
                },
              })}
            />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmPassword">{t.confirmPassword}</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              aria-invalid={!!errors.confirmPassword}
              {...register("confirmPassword", {
                required: t.confirmRequired,
                validate: (value) => value === getValues("password") || t.mismatch,
              })}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
            {isSubmitting ? dictionary.common.saving : t.submit}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
