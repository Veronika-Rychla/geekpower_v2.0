import { SiteLogo } from "@/components/site-logo";
import { SiteNav } from "@/components/site-nav";
import { UserMenu } from "@/components/user-menu";

export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
        <SiteLogo />
        <SiteNav />
        <UserMenu />
      </div>
    </header>
  );
}
