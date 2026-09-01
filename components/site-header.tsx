import { LogoutButton } from "@/components/logout-button";
import { SiteLogo } from "@/components/site-logo";
import { SiteNav } from "@/components/site-nav";
import { UserGreeting } from "@/components/user-greeting";

export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
        <SiteLogo />
        <SiteNav />
        <div className="flex items-center gap-4">
          <UserGreeting />
          <div className="flex items-center gap-2">
            <LogoutButton />
          </div>
        </div>
      </div>
    </header>
  );
}
