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

interface ForgotPasswordFields {
  email: string;
}

export function ForgotPasswordForm() {
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
          <CardTitle className="text-xl">Check your email</CardTitle>
          <CardDescription>
            If an account exists for that email, we&apos;ve sent a link to set a new password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            ← Back to login
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Forgot password?</CardTitle>
        <CardDescription>Enter your email and we&apos;ll send you a link to set a new one.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              aria-invalid={!!errors.email}
              {...register("email", { required: "Email is required" })}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
            {isSubmitting ? "Sending…" : "Send reset link"}
          </Button>

          <Link
            href="/"
            className="text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Back to login
          </Link>
        </form>
      </CardContent>
    </Card>
  );
}
