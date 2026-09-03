import { SiteLogo } from "@/components/site-logo";
import { SiteNav } from "@/components/site-nav";
import { MobileMenu } from "@/components/mobile-menu";
import { UserMenu } from "@/components/user-menu";

export function SiteHeader() {
  return (
    <header className="relative border-b border-border">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4 sm:grid sm:grid-cols-[1fr_auto_1fr]">
        <SiteLogo />
        <div className="sm:justify-self-center">
          <SiteNav />
        </div>
        <div className="flex items-center gap-4 sm:justify-self-end sm:gap-6">
          <MobileMenu />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
