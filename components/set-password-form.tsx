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

interface SetPasswordFields {
  password: string;
  confirmPassword: string;
}

export function SetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
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
          <CardTitle className="text-xl">Password set</CardTitle>
          <CardDescription>You can now log in with your new password.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={() => router.push("/")}>
            Go to login
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Set your password</CardTitle>
        <CardDescription>Choose a password to finish setting up your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              aria-invalid={!!errors.password}
              {...register("password", {
                required: "Password is required",
                minLength: { value: 8, message: "Password must be at least 8 characters" },
              })}
            />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              aria-invalid={!!errors.confirmPassword}
              {...register("confirmPassword", {
                required: "Please confirm your password",
                validate: (value) => value === getValues("password") || "Passwords do not match",
              })}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Set password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
