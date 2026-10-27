import { DateTime } from "luxon";

import { sql } from "@/app/database";
import type { AnnouncementView } from "@/lib/types";

const ANNOUNCEMENTS_LIMIT = 100;

/** Newest first, with the author's current name joined from users. */
export async function getAnnouncements(): Promise<AnnouncementView[]> {
  const rows = await sql`
    SELECT a.guid, a.title, a.body, a.created_at, a.updated_at, u.first_name, u.last_name
    FROM announcements a
    JOIN users u ON u.guid = a.author_guid
    ORDER BY a.created_at DESC
    LIMIT ${ANNOUNCEMENTS_LIMIT}
  `;

  return rows.map((row) => ({
    guid: row.guid as string,
    title: row.title as string,
    body: row.body as string,
    authorName: `${row.first_name} ${row.last_name}`.trim(),
    // Neon returns timestamptz columns as JS Dates
    createdAt: DateTime.fromJSDate(row.created_at as Date).toISO()!,
    updatedAt: row.updated_at ? DateTime.fromJSDate(row.updated_at as Date).toISO() : null,
  }));
}
