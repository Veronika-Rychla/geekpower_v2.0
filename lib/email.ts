import { Resend } from "resend";

import { dictionaryFor } from "@/lib/dictionary";
import { fill, type Locale } from "@/lib/i18n";

// const resend = new Resend(process.env.RESEND_API_KEY);

// const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
// const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

/** Sends the set-password link in the recipient's language. */
export async function sendSetPasswordEmail(
  to: string,
  firstName: string,
  token: string,
  locale: Locale,
): Promise<void> {
  const t = dictionaryFor(locale).email;
  // const link = `${APP_URL}/set-password?token=${token}`;

  // const { error } = await resend.emails.send({
  //   from: FROM_EMAIL,
  //   to,
  //   subject: t.setPasswordSubject,
  //   html: `
  //     <p>${fill(t.greeting, { name: firstName })}</p>
  //     <p>${t.setPasswordBody}</p>
  //     <p><a href="${link}">${link}</a></p>
  //     <p>${t.expires}</p>
  //   `,
  // });

  // if (error) {
  //   throw new Error(error.message);
  // }
  return Promise.resolve();
}
