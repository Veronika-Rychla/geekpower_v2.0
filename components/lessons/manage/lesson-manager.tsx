import Link from "next/link";
import { Pencil, Plus } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteDialog } from "@/components/delete-dialog";
import { LessonDialog } from "@/components/lessons/manage/lesson-dialog";
import { deleteLesson, deleteSublesson } from "@/lib/actions";
import type { LessonMeta } from "@/lib/lessons";
import { cn } from "@/lib/utils";

function DraftBadge() {
  return (
    <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs font-normal text-muted-foreground">
      Draft
    </span>
  );
}

/** The teacher's view of /lessons: every lesson and section, with add, edit and delete. */
export function LessonManager({ lessons }: { lessons: LessonMeta[] }) {
  return (
    <div className="flex flex-col gap-4">
      {lessons.map((lesson) => (
        <Card key={lesson.guid} className={cn(lesson.isDraft && "border-dashed")}>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <CardTitle>
                  <Link href={`/lessons/${lesson.slug}`} className="hover:underline">
                    {lesson.displayTitle}
                  </Link>
                </CardTitle>
                {lesson.isDraft && <DraftBadge />}
              </div>
              <div className="flex shrink-0 items-center">
                <LessonDialog
                  lesson={{ guid: lesson.guid, title: lesson.title, slug: lesson.slug, isDraft: lesson.isDraft }}
                />
                <DeleteDialog
                  itemLabel="lesson"
                  title={lesson.title}
                  description="All its sections and every student's progress in it are deleted too."
                  onDelete={deleteLesson.bind(null, lesson.guid)}
                />
              </div>
            </div>
          </CardHeader>

          <ul className="flex flex-col px-4 pb-2">
            {lesson.sublessons.map((sublesson) => (
              <li
                key={sublesson.guid}
                className="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted/50"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Link
                    href={`/lessons/${lesson.slug}/${sublesson.slug}`}
                    className={cn("truncate hover:underline", sublesson.isDraft && "text-muted-foreground italic")}
                  >
                    {sublesson.displayTitle}
                  </Link>
                  {sublesson.isDraft && <DraftBadge />}
                </div>
                <div className="flex shrink-0 items-center">
                  <Link
                    href={`/lesson-editor/${sublesson.guid}`}
                    aria-label="Edit section"
                    title="Edit section"
                    className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                  >
                    <Pencil className="size-3.5" />
                  </Link>
                  <DeleteDialog
                    itemLabel="section"
                    title={sublesson.title}
                    description="Every student's progress in it is deleted too."
                    onDelete={deleteSublesson.bind(null, sublesson.guid)}
                  />
                </div>
              </li>
            ))}
            {lesson.sublessons.length === 0 && (
              <li className="px-2 py-1 text-sm text-muted-foreground">No sections yet.</li>
            )}
          </ul>

          <div className="px-6 pb-4">
            <Link
              href={`/lesson-editor/new?lesson=${lesson.guid}`}
              className={buttonVariants({ variant: "outline", size: "sm", className: "gap-1.5" })}
            >
              <Plus className="size-3.5" />
              Add section
            </Link>
          </div>
        </Card>
      ))}
      {lessons.length === 0 && <p className="text-sm text-muted-foreground">No lessons yet.</p>}
    </div>
  );
}
