import "server-only";

import { neon } from "@neondatabase/serverless";
import { DateTime } from "luxon";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be a Neon postgres connection string");
}

export const sql = neon(process.env.DATABASE_URL);

/** Neon returns `timestamptz` columns as JS Dates; everything past the DB layer uses ISO strings. */
export function toIso(value: unknown): string | null {
  return value instanceof Date ? DateTime.fromJSDate(value).toISO() : null;
}
