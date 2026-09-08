import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SetPasswordForm } from "@/components/set-password-form";

export default async function SetPasswordPage({ searchParams }: PageProps<"/set-password">) {
  const { token } = await searchParams;

  if (!token || Array.isArray(token)) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-xl">Invalid link</CardTitle>
            <CardDescription>
              This set-password link is missing or malformed. Ask your teacher for a new one, or use
              &quot;Forgot password?&quot; on the login page.
            </CardDescription>
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
