"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckCircle2, Circle } from "lucide-react";

import { cn } from "@/lib/utils";
import type { SublessonMeta } from "@/lib/lessons";

interface LessonSidebarProps {
  lessonSlug: string;
  lessonTitle: string;
  sublessons: SublessonMeta[];
}

export function LessonSidebar({ lessonSlug, lessonTitle, sublessons }: LessonSidebarProps) {
  const pathname = usePathname();

  return (
    <nav className="flex w-64 shrink-0 flex-col gap-1 border-r border-border p-4">
      <Link
        href="/lessons"
        className="mb-4 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        ← All lessons
      </Link>
      <h2 className="mb-2 px-2 text-sm font-semibold">{lessonTitle}</h2>
      {sublessons.map((sublesson) => {
        const href = `/lessons/${lessonSlug}/${sublesson.slug}`;
        const isActive = pathname === href;

        return (
          <Link
            key={sublesson.slug}
            href={href}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
              isActive
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {sublesson.completedAt ? (
              <CheckCircle2 className="size-3.5 shrink-0 text-green-500" />
            ) : (
              <Circle className="size-3.5 shrink-0" />
            )}
            <span className="truncate">{sublesson.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
