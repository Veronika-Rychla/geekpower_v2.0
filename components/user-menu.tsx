"use client";

import { useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { ChevronDown, CircleUser, LogOut, Palette } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemePicker, ThemePickerButton } from "@/components/theme-picker";

/** The signed-in user's name, opening a menu with their settings and log out. */
export function UserMenu() {
  const { data: session } = useSession();
  const trigger = useRef<HTMLButtonElement>(null);
  const [themeOpen, setThemeOpen] = useState(false);
  // "Colors" opens the picker once the menu has finished closing, so the
  // menu handing focus back to its trigger doesn't close the picker again.
  const themeRequested = useRef(false);

  if (!session?.user) {
    return <ThemePickerButton />;
  }

  return (
    <>
      <DropdownMenu
        onOpenChangeComplete={(open) => {
          if (!open && themeRequested.current) {
            themeRequested.current = false;
            setThemeOpen(true);
          }
        }}
      >
        <DropdownMenuTrigger
          render={
            <Button
              ref={trigger}
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              aria-label="User menu"
            />
          }
        >
          <CircleUser />
          <span className="hidden max-w-40 truncate sm:inline">
            {session.user.name}
          </span>
          <ChevronDown className="hidden sm:block" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="w-48">
          <DropdownMenuItem onClick={() => (themeRequested.current = true)}>
            <Palette />
            Colors
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ThemePicker
        open={themeOpen}
        onOpenChange={setThemeOpen}
        anchor={trigger}
      />
    </>
  );
}
