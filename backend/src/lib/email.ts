import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../env.js";

// Email delivery with two transports:
//   1. Brevo HTTP API (over HTTPS/443) — preferred, because many hosts (Render,
//      etc.) block outbound SMTP ports. Used when BREVO_API_KEY is set.
//   2. Generic SMTP (nodemailer) — fallback for local dev or other providers.
// It's a no-op until one of them is configured, so the app runs fine without email.

export function isEmailConfigured(): boolean {
  return !!(env.BREVO_API_KEY || (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS));
}

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Parse EMAIL_FROM ("LendAHand <addr@x.com>" or "addr@x.com") into name + email.
function parseFrom(): { name: string; email: string } {
  const raw = env.EMAIL_FROM || env.SMTP_USER || "";
  const m = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1] || "LendAHand", email: m[2] };
  return { name: "LendAHand", email: raw };
}

async function sendViaBrevoApi(email: OutgoingEmail): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": env.BREVO_API_KEY as string,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: parseFrom(),
        to: [{ email: email.to }],
        subject: email.subject,
        htmlContent: email.html,
        textContent: email.text,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Brevo API ${res.status}: ${body.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Brevo API error" };
  }
}

let transporter: Transporter | null = null;
function getTransporter(): Transporter | null {
  if (!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS)) return null;
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

async function sendViaSmtp(email: OutgoingEmail): Promise<{ ok: boolean; error?: string }> {
  const tx = getTransporter();
  if (!tx) return { ok: false, error: "Email not configured" };
  try {
    await tx.sendMail({
      from: env.EMAIL_FROM || `LendAHand <${env.SMTP_USER}>`,
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

export async function sendEmail(email: OutgoingEmail): Promise<{ ok: boolean; error?: string }> {
  // Prefer the HTTP API when available (works on hosts that block SMTP ports).
  if (env.BREVO_API_KEY) return sendViaBrevoApi(email);
  return sendViaSmtp(email);
}
