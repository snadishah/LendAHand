import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../env.js";

// Email delivery via generic SMTP — works with any provider (Gmail, Outlook/
// Hotmail, Zoho, a custom domain, …). It's a no-op until SMTP_HOST + SMTP_USER +
// SMTP_PASS are configured, so the app runs identically in development and
// won't break if email isn't set up yet.
let transporter: Transporter | null = null;

export function isEmailConfigured(): boolean {
  return !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

function getTransporter(): Transporter | null {
  if (!isEmailConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465, // 465 = implicit TLS; 587 = STARTTLS
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }
  return transporter;
}

// Most providers require the From address to match the authenticated account
// (a display name is fine). Fall back to that if EMAIL_FROM isn't set.
function fromAddress(): string {
  return env.EMAIL_FROM || `LendAHand <${env.SMTP_USER}>`;
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
