import Link from "next/link";

import { LoginForm, type DevLogin } from "@/components/login-form";

function getDevLogins(): DevLogin[] {
  if (process.env.NODE_ENV !== "development") return [];

  return [
    {
      label: "Teacher login",
      email: process.env.DEV_LOGIN_ADMIN_EMAIL,
      password: process.env.DEV_LOGIN_ADMIN_PASSWORD,
    },
    {
      label: "User login",
      email: process.env.DEV_LOGIN_USER_EMAIL,
      password: process.env.DEV_LOGIN_USER_PASSWORD,
    },
  ].filter((login): login is DevLogin => !!login.email && !!login.password);
}

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16">
      <LoginForm devLogins={getDevLogins()} />
      <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground">
        Read our blog →
      </Link>
    </div>
  );
}
