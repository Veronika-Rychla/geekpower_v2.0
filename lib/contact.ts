import "server-only";

import { z } from "zod";

import { sql } from "@/app/database";
import { toIso } from "@/lib/dates";
import type { ContactMessage } from "@/lib/types";

export const contactFormSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  message: z.string().trim().min(1).max(5000),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;

/** All contact form submissions (resolved and unresolved), newest first. Callers must restrict this to teachers/admins. */
export async function getContactMessages(): Promise<ContactMessage[]> {
  const rows = await sql`
    SELECT guid, name, email, message, created_at, resolved
    FROM contact_messages
    ORDER BY created_at DESC
  `;

  return rows.map((row) => ({
    guid: row.guid as string,
    name: row.name as string,
    email: row.email as string,
    message: row.message as string,
    createdAt: toIso(row.created_at),
    resolved: row.resolved as boolean,
  }));
}

/** Stores a contact form submission; the DB assigns guid and created_at. */
export async function createContactMessage({
  name,
  email,
  message,
}: ContactFormInput): Promise<ContactMessage> {
  const [row] = await sql`
    INSERT INTO contact_messages (name, email, message)
    VALUES (${name}, ${email}, ${message})
    RETURNING guid, created_at
  `;

  return {
    guid: row.guid as string,
    name,
    email,
    message,
    createdAt: toIso(row.created_at),
    resolved: false,
  };
}
