"use client";

import {
  useId,
  useOptimistic,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import Link from "next/link";
import { GripVertical, Pencil, Plus } from "lucide-react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteDialog } from "@/components/delete-dialog";
import { LessonDialog } from "@/components/lessons/manage/lesson-dialog";
import {
  deleteLesson,
  deleteSublesson,
  reorderLessons,
  reorderSublessons,
} from "@/lib/actions";
import type { LessonMeta, SublessonMeta } from "@/lib/lessons";
import { cn } from "@/lib/utils";

function DraftBadge() {
  return (
    <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs font-normal text-muted-foreground">
      Draft
    </span>
  );
}

/**
 * A drag-and-drop list of `items`: shows the new order right away while `save`
 * stores it, and falls back to the server's order if saving fails.
 */
function SortableList<T extends { guid: string }>({
  items,
  label,
  save,
  className,
  children,
}: {
  items: T[];
  /** What's being reordered, for the error message, e.g. "lessons". */
  label: string;
  save: (guids: string[]) => Promise<{ error: string } | { success: true }>;
  className?: string;
  children: (item: T) => ReactNode;
}) {
  const dndId = useId();
  const [optimisticItems, setOptimisticItems] = useOptimistic(items);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = optimisticItems.findIndex((item) => item.guid === active.id);
    const to = optimisticItems.findIndex((item) => item.guid === over.id);
    const reordered = arrayMove(optimisticItems, from, to);

    setError(null);
    startTransition(async () => {
      setOptimisticItems(reordered);
      try {
        const result = await save(reordered.map((item) => item.guid));
        if ("error" in result) setError(result.error);
      } catch {
        setError(`Couldn't save the new order of ${label}. Try again.`);
      }
    });
  }

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={optimisticItems.map((item) => item.guid)}
        strategy={verticalListSortingStrategy}
      >
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <ul className={className}>{optimisticItems.map(children)}</ul>
      </SortableContext>
    </DndContext>
  );
}

/** An item of a `SortableList`, dragged by the handle it renders before `children`. */
function SortableItem({
  id,
  handleLabel,
  className,
  children,
}: {
  id: string;
  handleLabel: string;
  className?: string;
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "flex items-start gap-1",
        isDragging && "relative z-10 opacity-80",
        className,
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        aria-label={handleLabel}
        title={handleLabel}
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "shrink-0 cursor-grab touch-none text-muted-foreground active:cursor-grabbing",
        )}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  );
}

function SublessonRow({
  lesson,
  sublesson,
}: {
  lesson: LessonMeta;
  sublesson: SublessonMeta;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted/50">
      <div className="flex min-w-0 items-center gap-2">
        <Link
          href={`/lessons/${lesson.slug}/${sublesson.slug}`}
          className={cn(
            "truncate hover:underline",
            sublesson.isDraft && "text-muted-foreground italic",
          )}
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
    </div>
  );
}

function LessonCard({ lesson }: { lesson: LessonMeta }) {
  return (
    <Card className={cn(lesson.isDraft && "border-dashed")}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <CardTitle>
              <Link
                href={`/lessons/${lesson.slug}`}
                className="hover:underline"
              >
                {lesson.displayTitle}
              </Link>
            </CardTitle>
            {lesson.isDraft && <DraftBadge />}
          </div>
          <div className="flex shrink-0 items-center">
            <LessonDialog
              lesson={{
                guid: lesson.guid,
                title: lesson.title,
                slug: lesson.slug,
                isDraft: lesson.isDraft,
              }}
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

      <div className="px-4 pb-2">
        {lesson.sublessons.length > 0 ? (
          <SortableList
            items={lesson.sublessons}
            label="sections"
            save={reorderSublessons.bind(null, lesson.guid)}
            className="flex flex-col"
          >
            {(sublesson) => (
              <SortableItem
                key={sublesson.guid}
                id={sublesson.guid}
                handleLabel="Drag to reorder section"
              >
                <SublessonRow lesson={lesson} sublesson={sublesson} />
              </SortableItem>
            )}
          </SortableList>
        ) : (
          <p className="px-2 py-1 text-sm text-muted-foreground">
            No sections yet.
          </p>
        )}
      </div>

      <div className="px-6 pb-4">
        <Link
          href={`/lesson-editor/new?lesson=${lesson.guid}`}
          className={buttonVariants({
            variant: "outline",
            size: "sm",
            className: "gap-1.5",
          })}
        >
          <Plus className="size-3.5" />
          Add section
        </Link>
      </div>
    </Card>
  );
}

/** The teacher's view of /lessons: every lesson and section, with add, edit, delete and drag-and-drop reordering. */
export function LessonManager({ lessons }: { lessons: LessonMeta[] }) {
  if (lessons.length === 0) {
    return <p className="text-sm text-muted-foreground">No lessons yet.</p>;
  }

  return (
    <SortableList
      items={lessons}
      label="lessons"
      save={reorderLessons}
      className="flex flex-col gap-4"
    >
      {(lesson) => (
        <SortableItem
          key={lesson.guid}
          id={lesson.guid}
          handleLabel="Drag to reorder lesson"
          className="gap-2"
        >
          <LessonCard lesson={lesson} />
        </SortableItem>
      )}
    </SortableList>
  );
}
