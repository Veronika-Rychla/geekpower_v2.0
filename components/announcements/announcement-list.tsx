import type { AnnouncementType, AnnouncementView } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";
import { AnnouncementDialog } from "@/components/announcements/announcement-dialog";
import { DeleteAnnouncementDialog } from "@/components/announcements/delete-announcement-dialog";

const TYPE_STYLES: Record<AnnouncementType, { border: string; badge: string }> = {
  Announcement: { border: "border-l-sky-500", badge: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  Update: { border: "border-l-emerald-500", badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
};

interface AnnouncementListProps {
  announcements: AnnouncementView[];
  /** Shows edit and delete buttons on each announcement. */
  canManage?: boolean;
}

export function AnnouncementList({ announcements, canManage = false }: AnnouncementListProps) {
  if (announcements.length === 0) {
    return <p className="text-sm text-muted-foreground">No announcements yet.</p>;
  }

  return (
    <ul className="-mr-2 flex max-h-112 flex-col divide-y divide-foreground/10 overflow-y-auto pr-2">
      {announcements.map((announcement) => (
        <li
          key={announcement.guid}
          className={cn(
            "flex flex-col gap-1 border-l-4 py-3 pl-3 first:pt-0 last:pb-0",
            TYPE_STYLES[announcement.type].border,
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col items-start gap-1">
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", TYPE_STYLES[announcement.type].badge)}>
                {announcement.type}
              </span>
              <h3 className="font-medium">{announcement.title}</h3>
            </div>
            {canManage && (
              <div className="-mt-1 flex shrink-0 gap-1">
                <AnnouncementDialog announcement={announcement} />
                <DeleteAnnouncementDialog guid={announcement.guid} title={announcement.title} />
              </div>
            )}
          </div>
          <p className="whitespace-pre-wrap text-muted-foreground">{announcement.body}</p>
          <p className="text-right text-xs text-muted-foreground">
            {announcement.authorName} · {formatDateTime(announcement.createdAt)}
            {announcement.updatedAt && " (edited)"}
          </p>
        </li>
      ))}
    </ul>
  );
}
