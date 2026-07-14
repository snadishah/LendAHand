import { Resend } from "resend";
import { env } from "../env.js";

// Email delivery is a no-op until RESEND_API_KEY is configured, so the app runs
// identically in development and won't break if email isn't set up yet.
let client: Resend | null = null;

export function isEmailConfigured(): boolean {
  return !!env.RESEND_API_KEY;
}

function getClient(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  if (!client) client = new Resend(env.RESEND_API_KEY);
  return client;
}

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(email: OutgoingEmail): Promise<{ ok: boolean; error?: string }> {
  const resend = getClient();
  if (!resend) return { ok: false, error: "Email not configured" };

  try {
    const { error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text ?? undefined,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown email error" };
  }
}
