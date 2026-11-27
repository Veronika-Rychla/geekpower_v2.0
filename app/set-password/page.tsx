import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SetPasswordForm } from "@/components/set-password-form";
import { getDictionary } from "@/lib/dictionary";

export default async function SetPasswordPage({ searchParams }: PageProps<"/set-password">) {
  const { token } = await searchParams;
  const t = (await getDictionary()).setPassword;

  if (!token || Array.isArray(token)) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-xl">{t.invalidLinkTitle}</CardTitle>
            <CardDescription>{t.invalidLinkDescription}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <SetPasswordForm token={token} />
    </div>
  );
}
