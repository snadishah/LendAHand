import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/httpError.js";
import { env } from "../env.js";
import { geocodeAddress } from "../lib/geocode.js";
import { haversineDistanceKm } from "../lib/distance.js";
import { notify } from "./notification.service.js";
import { queueUserEmail } from "./email.service.js";
import { workSubmittedEmail, paymentReleasedEmail, reviewRequestEmail } from "../lib/emailTemplates.js";

const taskInclude = {
  category: true,
  poster: { select: { id: true, name: true } },
  helper: { select: { id: true, name: true } },
} as const;

export interface CreateTaskInput {
  title: string;
  description: string;
  categoryId: number;
  address: string;
  budget: number;
}

export async function createTask(posterId: number, input: CreateTaskInput) {
  const geo = await geocodeAddress(input.address);

  return prisma.task.create({
    data: {
      posterId,
      categoryId: input.categoryId,
      title: input.title,
      description: input.description,
      address: input.address,
      budget: input.budget,
      latitude: geo?.lat ?? null,
      longitude: geo?.lng ?? null,
    },
    include: taskInclude,
  });
}

export interface ListTasksFilter {
  categoryId?: number;
  status?: "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED";
  near?: string;
}

export async function listTasks(filter: ListTasksFilter) {
  const tasks = await prisma.task.findMany({
    where: {
      status: filter.status ?? "OPEN",
      ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
    },
    include: taskInclude,
    orderBy: { createdAt: "desc" },
  });

  if (!filter.near) return tasks;

  const origin = await geocodeAddress(filter.near);
  if (!origin) return tasks;

  return tasks
    .map((task) => ({
      ...task,
      distanceKm:
        task.latitude != null && task.longitude != null
          ? haversineDistanceKm(origin.lat, origin.lng, task.latitude, task.longitude)
          : null,
    }))
    .sort((a, b) => {
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    });
}

export async function getMapTasks() {
  return prisma.task.findMany({
    where: { latitude: { not: null }, longitude: { not: null } },
    include: taskInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function getTasksForUser(userId: number, tab: "posted" | "helping") {
  return prisma.task.findMany({
    where: tab === "posted" ? { posterId: userId } : { helperId: userId },
    include: taskInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function getTaskById(taskId: number) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: taskInclude,
  });
  if (!task) throw new HttpError(404, "Task not found");
  return task;
}

export async function cancelTask(taskId: number, posterId: number) {
  return prisma.$transaction(async (tx) => {
    const task = await tx.task.findUniqueOrThrow({ where: { id: taskId } });
    if (task.posterId !== posterId) throw new HttpError(403, "Not your task");
    if (task.status === "SUBMITTED") {
      throw new HttpError(
        400,
        "The helper has submitted their work — please confirm it or open a dispute instead of cancelling."
      );
    }
    if (task.status !== "OPEN" && task.status !== "IN_PROGRESS") {
      throw new HttpError(400, "Task cannot be cancelled in its current state");
    }

    if (task.status === "IN_PROGRESS" && task.acceptedAmount) {
      await tx.user.update({
        where: { id: posterId },
        data: { walletBalance: { increment: task.acceptedAmount } },
      });
      await tx.walletTransaction.create({
        data: {
          userId: posterId,
          type: "REFUND",
          amount: task.acceptedAmount,
          note: `Refund for cancelled task #${taskId}`,
        },
      });
      if (task.helperId) {
        await notify(tx, task.helperId, `The task "${task.title}" was cancelled by the poster.`);
      }
    }

    return tx.task.update({
      where: { id: taskId },
      data: { status: "CANCELLED" },
      include: taskInclude,
    });
  });
}

// The helper marks their work as submitted; the task waits on the poster's
// confirmation (or auto-releases after the deadline). From here the poster can
// no longer cancel-and-reclaim — only confirm or dispute.
export async function submitTask(taskId: number, helperId: number) {
  return prisma.$transaction(async (tx) => {
    const task = await tx.task.findUniqueOrThrow({ where: { id: taskId } });
    if (task.helperId !== helperId) throw new HttpError(403, "You're not the helper on this task");
    if (task.status !== "IN_PROGRESS") {
      throw new HttpError(400, "This task isn't in progress");
    }

    await notify(
      tx,
      task.posterId,
      `${task.title}: the helper marked the work as done. Please review and confirm to release payment.`
    );
    await queueUserEmail(tx, task.posterId, (u) =>
      workSubmittedEmail(u.name, task.title, `${env.APP_URL}/tasks/${taskId}`)
    );

    return tx.task.update({
      where: { id: taskId },
      data: { status: "SUBMITTED", submittedAt: new Date() },
      include: taskInclude,
    });
  });
}

// The poster confirms completion, releasing the escrowed payment to the helper.
// Allowed from IN_PROGRESS (poster releases early) or SUBMITTED.
export async function confirmTask(taskId: number, posterId: number) {
  return prisma.$transaction(async (tx) => {
    const task = await tx.task.findUniqueOrThrow({ where: { id: taskId } });
    if (task.posterId !== posterId) throw new HttpError(403, "Not your task");
    if (
      (task.status !== "IN_PROGRESS" && task.status !== "SUBMITTED") ||
      !task.helperId ||
      !task.acceptedAmount
    ) {
      throw new HttpError(400, "Task can't be confirmed in its current state");
    }

    await releaseEscrowToHelper(tx, task.id, task.helperId, task.acceptedAmount, task.title);

    const reviewLink = `${env.APP_URL}/tasks/${taskId}`;
    await queueUserEmail(tx, task.posterId, (u) => reviewRequestEmail(u.name, task.title, reviewLink, u.unsubscribeUrl));
    await queueUserEmail(tx, task.helperId, (u) => reviewRequestEmail(u.name, task.title, reviewLink, u.unsubscribeUrl));

    return tx.task.update({
      where: { id: taskId },
      data: { status: "DONE" },
      include: taskInclude,
    });
  });
}

const AUTO_RELEASE_DAYS = 3;

// Safety net: if a poster never confirms submitted work, release the payment to
// the helper after the deadline so their money can't be trapped indefinitely.
export async function autoReleaseExpiredSubmissions(): Promise<number> {
  const cutoff = new Date(Date.now() - AUTO_RELEASE_DAYS * 24 * 60 * 60 * 1000);
  const due = await prisma.task.findMany({
    where: { status: "SUBMITTED", submittedAt: { lt: cutoff } },
    select: { id: true },
  });

  let released = 0;
  for (const { id } of due) {
    try {
      await prisma.$transaction(async (tx) => {
        const task = await tx.task.findUniqueOrThrow({ where: { id } });
        if (task.status !== "SUBMITTED" || !task.helperId || !task.acceptedAmount) return;
        await releaseEscrowToHelper(tx, task.id, task.helperId, task.acceptedAmount, task.title, true);
        await tx.task.update({ where: { id }, data: { status: "DONE" } });
        released++;
      });
    } catch (err) {
      console.error(`Auto-release failed for task #${id}`, err);
    }
  }
  return released;
}

// Shared escrow-release: credit the helper, log the transaction, notify them.
// Exported for use by dispute resolution as well.
export async function releaseEscrowToHelper(
  tx: Prisma.TransactionClient,
  taskId: number,
  helperId: number,
  amount: number,
  title: string,
  auto = false
) {
  await tx.user.update({
    where: { id: helperId },
    data: { walletBalance: { increment: amount } },
  });
  await tx.walletTransaction.create({
    data: {
      userId: helperId,
      type: "ESCROW_RELEASE",
      amount,
      note: `Payment released for task #${taskId}`,
    },
  });
  await notify(
    tx,
    helperId,
    auto
      ? `You've been auto-paid Rs. ${amount} for "${title}" (the poster didn't confirm in time).`
      : `You've been paid Rs. ${amount} for completing "${title}"!`
  );
  await queueUserEmail(tx, helperId, (u) => paymentReleasedEmail(u.name, title, amount, auto));
}
