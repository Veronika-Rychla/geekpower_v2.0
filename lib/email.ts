import "server-only";

import { Resend } from "resend";

import { dictionaryFor } from "@/lib/dictionary";
import { fill, type Locale } from "@/lib/i18n";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

/** "invite": a teacher created the account; "reset": the user asked via "Forgot password?". */
export type SetPasswordEmailKind = "invite" | "reset";

export function setPasswordLink(token: string): string {
  return `${APP_URL}/set-password?token=${encodeURIComponent(token)}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Sends the set-password link in the recipient's language. Throws if Resend rejects it. */
export async function sendSetPasswordEmail(
  to: string,
  firstName: string,
  token: string,
  locale: Locale,
  kind: SetPasswordEmailKind,
): Promise<void> {
  const t = dictionaryFor(locale).email;
  const link = setPasswordLink(token);
  const subject =
    kind === "invite" ? t.setPasswordSubject : t.resetPasswordSubject;
  const paragraphs = [
    fill(t.greeting, { name: firstName }),
    kind === "invite" ? t.setPasswordBody : t.resetPasswordBody,
  ];
  const footer = [t.expires, ...(kind === "reset" ? [t.notRequested] : [])];

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html: [
      ...paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`),
      `<p><a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p>`,
      ...footer.map((p) => `<p>${escapeHtml(p)}</p>`),
    ].join("\n"),
    text: [...paragraphs, link, ...footer].join("\n\n"),
  });

  if (error) {
    throw new Error(`${error.name}: ${error.message}`);
  }
}
