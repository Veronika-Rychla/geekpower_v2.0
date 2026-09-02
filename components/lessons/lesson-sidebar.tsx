"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckCircle2, ChevronDown, Circle } from "lucide-react";

import { cn } from "@/lib/utils";
import type { SublessonMeta } from "@/lib/lessons";

interface LessonSidebarProps {
  lessonSlug: string;
  lessonTitle: string;
  sublessons: SublessonMeta[];
  showProgress: boolean;
}

export function LessonSidebar({ lessonSlug, lessonTitle, sublessons, showProgress }: LessonSidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const activeSublesson = sublessons.find(
    (sublesson) => pathname === `/lessons/${lessonSlug}/${sublesson.slug}`,
  );

  const header = (
    <>
      <Link
        href="/lessons"
        className="mb-4 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        ← All lessons
      </Link>
      <h2 className="mb-2 px-2 text-sm font-semibold">{lessonTitle}</h2>
    </>
  );

  const sublessonLinks = (
    <>
      {sublessons.map((sublesson) => {
        const href = `/lessons/${lessonSlug}/${sublesson.slug}`;
        const isActive = pathname === href;

        return (
          <Link
            key={sublesson.slug}
            href={href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
              isActive
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {showProgress &&
              (sublesson.completedAt ? (
                <CheckCircle2 className="size-3.5 shrink-0 text-green-500" />
              ) : (
                <Circle className="size-3.5 shrink-0" />
              ))}
            <span className="truncate">{sublesson.title}</span>
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="border-b border-border md:w-64 md:shrink-0 md:border-b-0 md:border-r">
      <div className="bg-popover shadow-sm md:hidden">
        <div className="flex items-center justify-between gap-2 border-b border-border p-4">
          <h2 className="truncate text-sm font-semibold">{lessonTitle}</h2>
          <Link
            href="/lessons"
            className="shrink-0 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            ← All lessons
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-sm font-medium"
          aria-expanded={open}
        >
          <span className="truncate">{activeSublesson?.title ?? "Sections"}</span>
          <ChevronDown className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")} />
        </button>

        {open && (
          <nav className="flex flex-col gap-1 border-t border-border px-4 pb-4 pt-2">
            {sublessonLinks}
          </nav>
        )}
      </div>

      <nav className="hidden flex-col gap-1 p-4 md:flex">
        {header}
        {sublessonLinks}
      </nav>
    </div>
  );
}
