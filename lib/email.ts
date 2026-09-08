import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

export async function sendSetPasswordEmail(to: string, firstName: string, token: string): Promise<void> {
  const link = `${APP_URL}/set-password?token=${token}`;

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Set your GeekPower password",
    html: `
      <p>Hi ${firstName},</p>
      <p>Click the link below to set your password and access your GeekPower account:</p>
      <p><a href="${link}">${link}</a></p>
      <p>This link expires in 24 hours.</p>
    `,
  });

  if (error) {
    throw new Error(error.message);
  }
}
