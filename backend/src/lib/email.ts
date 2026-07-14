import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../env.js";

// Email delivery via Gmail SMTP. It's a no-op until GMAIL_USER +
// GMAIL_APP_PASSWORD are configured, so the app runs identically in
// development and won't break if email isn't set up yet.
//
// Note: Gmail free accounts cap at ~500 emails/day. When moving to a custom
// domain later, only this file (and the env vars) need to change.
let transporter: Transporter | null = null;

export function isEmailConfigured(): boolean {
  return !!(env.GMAIL_USER && env.GMAIL_APP_PASSWORD);
}

function getTransporter(): Transporter | null {
  if (!isEmailConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD },
    });
  }
  return transporter;
}

// Gmail requires the From address to be the authenticated account (a display
// name is fine). Fall back to that if EMAIL_FROM isn't set.
function fromAddress(): string {
  return env.EMAIL_FROM || `LendAHand <${env.GMAIL_USER}>`;
}

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(email: OutgoingEmail): Promise<{ ok: boolean; error?: string }> {
  const tx = getTransporter();
  if (!tx) return { ok: false, error: "Email not configured" };

  try {
    await tx.sendMail({
      from: fromAddress(),
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown email error" };
  }
}
