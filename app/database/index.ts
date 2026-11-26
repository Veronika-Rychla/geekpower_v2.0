import "server-only";

import { neon, neonConfig } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be a Neon postgres connection string");
}

/** Waits before each retry; the total covers a Neon compute waking up from scale-to-zero. */
const RETRY_DELAYS_MS = [500, 1500, 3000];

/**
 * Failures where the request never reached Neon, so sending it again can't
 * run a query twice. Errors after the connection was made (e.g. a reset
 * mid-response) are not retried: an INSERT might already have run.
 */
const CONNECT_ERROR_CODES = new Set([
  "UND_ERR_CONNECT_TIMEOUT",
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ENETUNREACH",
  "EHOSTUNREACH",
]);

function isConnectError(error: unknown): boolean {
  const cause = (error as { cause?: { code?: string } } | null)?.cause;
  return error instanceof TypeError && CONNECT_ERROR_CODES.has(cause?.code ?? "");
}

async function fetchWithRetry(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetch(input, init);
    } catch (error) {
      const delay = RETRY_DELAYS_MS[attempt];
      if (delay === undefined || !isConnectError(error)) {
        throw error;
      }
      console.warn(`Neon connection failed (${(error as { cause?: { code?: string } }).cause?.code}), retrying in ${delay} ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

// Every query goes over HTTP through this fetch (the body is a string, so it can be resent)
neonConfig.fetchFunction = fetchWithRetry;

export const sql = neon(process.env.DATABASE_URL);
