import { contactFormSchema, createContactMessage } from "@/lib/contact";
import {
  publicJson,
  publicPreflight,
  rejectIfRateLimited,
} from "@/lib/public-api";
import { createRateLimiter } from "@/lib/rate-limit";

/** Far stricter than reads: a person sends a contact form a handful of times at most. */
const checkContactRateLimit = createRateLimiter({
  limit: 5,
  windowSeconds: 600,
});

/** Name + email + 5000-char message fit well within this. */
const MAX_BODY_BYTES = 16 * 1024;

/**
 * POST /api/contact_form
 * Body (JSON): { name, email, message }, all required. Public, no authentication.
 * Responds 201 with { guid, createdAt }.
 */
export async function POST(request: Request) {
  const limited = rejectIfRateLimited(request, checkContactRateLimit);
  if (limited) return limited;

  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
    return publicJson(request, { error: "Request body too large" }, 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return publicJson(request, { error: "Invalid JSON body" }, 400);
  }

  const parsed = contactFormSchema.safeParse(body);
  if (!parsed.success) {
    return publicJson(
      request,
      {
        error: "Invalid contact form",
        fields: [...new Set(parsed.error.issues.map((i) => i.path.join(".")))],
      },
      400,
    );
  }

  const { guid, createdAt } = await createContactMessage(parsed.data);
  return publicJson(request, { guid, createdAt }, 201);
}

export function OPTIONS(request: Request) {
  return publicPreflight(request);
}
