import type { AnnouncementView } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { AnnouncementDialog } from "@/components/announcements/announcement-dialog";
import { DeleteAnnouncementDialog } from "@/components/announcements/delete-announcement-dialog";

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
        <li key={announcement.guid} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium">{announcement.title}</h3>
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
