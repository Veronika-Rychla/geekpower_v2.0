"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

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
import { useDictionary } from "@/components/i18n-provider";

export type DevLogin = {
  label: string;
  email: string;
  password: string;
};

export function LoginForm({ devLogins = [] }: { devLogins?: DevLogin[] }) {
  const router = useRouter();
  const dictionary = useDictionary();
  const t = dictionary.login;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await logIn(email, password);
  }

  async function logIn(email: string, password: string) {
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (!result || result.error) {
      setError(t.invalid);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">{t.title}</CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">{dictionary.common.email}</Label>
            <Input
              id="email"
              type="email"
              placeholder={dictionary.common.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t.password}</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {t.forgotPassword}
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="mt-2 w-full">
            {t.submit}
          </Button>
        </form>
        {devLogins.length > 0 && (
          <div className="mt-4 flex gap-2 border-t pt-4">
            {devLogins.map((login) => (
              <Button
                key={login.label}
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => logIn(login.email, login.password)}
              >
                {login.label}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
