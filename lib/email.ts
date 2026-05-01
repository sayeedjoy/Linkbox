import { Resend } from "resend";
import { getAppConfig } from "@/lib/app-config";

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const config = await getAppConfig();
  const apiKey = config.resendApiKey;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const resend = new Resend(apiKey);
  const from = config.resendFromEmail ?? "onboarding@resend.dev";
  await resend.emails.send({
    from,
    to,
    subject: "Reset your password",
    html: `
      <p>You requested a password reset. Click the link below to set a new password:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
    `,
  });
}
