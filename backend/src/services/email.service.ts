import type { Prisma, PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { env } from "../env.js";
import { isEmailConfigured, sendEmail } from "../lib/email.js";
import type { EmailContent } from "../lib/emailTemplates.js";

type TxClient = Prisma.TransactionClient | PrismaClient;

const MAX_ATTEMPTS = 5;

interface EmailUser {
  id: number;
  name: string;
  email: string;
  userType: "POSTER" | "HELPER";
  unsubscribeUrl: string;
}

// Queues an email for a user by inserting an outbox row (optionally within the
// caller's transaction). Non-essential mail is skipped for opted-out users.
export async function queueUserEmail(
  client: TxClient,
  userId: number,
  build: (user: EmailUser) => EmailContent
): Promise<void> {
  const user = await client.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, userType: true, emailOptOut: true },
  });
  if (!user) return;

  const unsubscribeUrl = `${env.APP_URL}/unsubscribe?token=${makeUnsubscribeToken(user.id)}`;
  const content = build({
    id: user.id,
    name: user.name,
    email: user.email,
    userType: user.userType as "POSTER" | "HELPER",
    unsubscribeUrl,
  });

  if (!content.essential && user.emailOptOut) return;

  await client.emailJob.create({
    data: { to: user.email, subject: content.subject, html: content.html, text: content.text, type: content.type },
  });
}

// Queues an email to a raw address (used pre-account-lookup, e.g. password
// reset where we already hold the user record).
export async function queueEmailTo(client: TxClient, to: string, content: EmailContent): Promise<void> {
  await client.emailJob.create({
    data: { to, subject: content.subject, html: content.html, text: content.text, type: content.type },
  });
}

// Delivers a batch of pending emails. Called by the background worker.
export async function processEmailJobs(batch = 20): Promise<{ sent: number; failed: number }> {
  if (!isEmailConfigured()) return { sent: 0, failed: 0 };

  const jobs = await prisma.emailJob.findMany({
    where: { status: "PENDING", attempts: { lt: MAX_ATTEMPTS } },
    orderBy: { createdAt: "asc" },
    take: batch,
  });

  let sent = 0;
  let failed = 0;
  for (const job of jobs) {
    const res = await sendEmail({ to: job.to, subject: job.subject, html: job.html, text: job.text ?? undefined });
    if (res.ok) {
      await prisma.emailJob.update({
        where: { id: job.id },
        data: { status: "SENT", sentAt: new Date(), attempts: job.attempts + 1 },
      });
      sent++;
    } else {
      const attempts = job.attempts + 1;
      await prisma.emailJob.update({
        where: { id: job.id },
        data: { status: attempts >= MAX_ATTEMPTS ? "FAILED" : "PENDING", attempts, lastError: res.error },
      });
      failed++;
    }
  }
  return { sent, failed };
}

// One-click unsubscribe: a signed token identifying the user, no login needed.
export function makeUnsubscribeToken(userId: number): string {
  return jwt.sign({ uid: userId, purpose: "unsubscribe" }, env.JWT_SECRET, { expiresIn: "365d" });
}

export function verifyUnsubscribeToken(token: string): number | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { uid: number; purpose: string };
    return payload.purpose === "unsubscribe" ? payload.uid : null;
  } catch {
    return null;
  }
}
