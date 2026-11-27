import Link from "next/link";

import { LoginForm, type DevLogin } from "@/components/login-form";
import { getDictionary, type Dictionary } from "@/lib/dictionary";

function getDevLogins(t: Dictionary["login"]): DevLogin[] {
  if (process.env.NODE_ENV !== "development") return [];

  return [
    {
      label: t.devTeacher,
      email: process.env.DEV_LOGIN_ADMIN_EMAIL,
      password: process.env.DEV_LOGIN_ADMIN_PASSWORD,
    },
    {
      label: t.devUser,
      email: process.env.DEV_LOGIN_USER_EMAIL,
      password: process.env.DEV_LOGIN_USER_PASSWORD,
    },
  ].filter((login): login is DevLogin => !!login.email && !!login.password);
}

export default async function Home() {
  const t = (await getDictionary()).login;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16">
      <LoginForm devLogins={getDevLogins(t)} />
      <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground">
        {t.readBlog}
      </Link>
    </div>
  );
}
