import { SiteLogo } from "@/components/site-logo";
import { SiteNav } from "@/components/site-nav";
import { UserMenu } from "@/components/user-menu";

export function SiteHeader() {
  return (
    <header className="relative border-b border-border">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
        <SiteLogo />
        <div className="flex items-center gap-4 sm:gap-6">
          <SiteNav />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
