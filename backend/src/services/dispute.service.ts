import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/httpError.js";
import { env } from "../env.js";
import { notify } from "./notification.service.js";
import { releaseEscrowToHelper } from "./task.service.js";
import { queueUserEmail } from "./email.service.js";
import { disputeOpenedEmail, disputeResolvedEmail } from "../lib/emailTemplates.js";
import type { DisputeResolution } from "../types/domain.js";

const disputeInclude = {
  task: { select: { id: true, title: true, acceptedAmount: true } },
  raisedBy: { select: { id: true, name: true } },
} as const;

// Either party on an escrowed task can raise a dispute. This freezes the task
// (status DISPUTED) so it can't be confirmed, cancelled, or auto-released until
// an admin settles it.
export async function raiseDispute(taskId: number, userId: number, reason: string) {
  return prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({ where: { id: taskId } });
    if (!task) throw new HttpError(404, "Task not found");

    const isParty = task.posterId === userId || task.helperId === userId;
    if (!isParty) throw new HttpError(403, "You're not part of this task");
    if (task.status !== "IN_PROGRESS" && task.status !== "SUBMITTED") {
      throw new HttpError(400, "Only an active, in-progress task can be disputed");
    }

    const open = await tx.dispute.findFirst({ where: { taskId, status: "OPEN" } });
    if (open) throw new HttpError(409, "There's already an open dispute for this task");

    const dispute = await tx.dispute.create({
      data: { taskId, raisedById: userId, reason },
    });
    await tx.task.update({ where: { id: taskId }, data: { status: "DISPUTED" } });

    const otherId = task.posterId === userId ? task.helperId : task.posterId;
    if (otherId) {
      await notify(tx, otherId, `A dispute was opened on "${task.title}". Our team will review it.`);
      await queueUserEmail(tx, otherId, (u) =>
        disputeOpenedEmail(u.name, task.title, `${env.APP_URL}/tasks/${task.id}`)
      );
    }

    return dispute;
  });
}

export async function listDisputes(status?: "OPEN" | "RESOLVED") {
  return prisma.dispute.findMany({
    where: status ? { status } : {},
    include: disputeInclude,
    orderBy: { createdAt: "desc" },
  });
}

// Admin decision: RELEASED pays the helper; REFUNDED returns escrow to the poster.
export async function resolveDispute(
  disputeId: number,
  adminId: number,
  resolution: DisputeResolution,
  note?: string
) {
  return prisma.$transaction(async (tx) => {
    const dispute = await tx.dispute.findUnique({ where: { id: disputeId } });
    if (!dispute) throw new HttpError(404, "Dispute not found");
    if (dispute.status !== "OPEN") throw new HttpError(400, "This dispute is already resolved");

    const task = await tx.task.findUniqueOrThrow({ where: { id: dispute.taskId } });
    if (!task.helperId || !task.acceptedAmount) {
      throw new HttpError(400, "Disputed task has no escrow to settle");
    }

    if (resolution === "RELEASED") {
      await releaseEscrowToHelper(tx, task.id, task.helperId, task.acceptedAmount, task.title);
      await tx.task.update({ where: { id: task.id }, data: { status: "DONE" } });
    } else {
      await tx.user.update({
        where: { id: task.posterId },
        data: { walletBalance: { increment: task.acceptedAmount } },
      });
      await tx.walletTransaction.create({
        data: {
          userId: task.posterId,
          type: "REFUND",
          amount: task.acceptedAmount,
          note: `Dispute refund for task #${task.id}`,
        },
      });
      await tx.task.update({ where: { id: task.id }, data: { status: "CANCELLED" } });
    }

    const outcomeMsg =
      resolution === "RELEASED"
        ? `The dispute on "${task.title}" was resolved: payment released to the helper.`
        : `The dispute on "${task.title}" was resolved: the poster was refunded.`;
    const released = resolution === "RELEASED";
    await notify(tx, task.posterId, outcomeMsg);
    await queueUserEmail(tx, task.posterId, (u) => disputeResolvedEmail(u.name, task.title, released));
    if (task.helperId) {
      await notify(tx, task.helperId, outcomeMsg);
      await queueUserEmail(tx, task.helperId, (u) => disputeResolvedEmail(u.name, task.title, released));
    }

    return tx.dispute.update({
      where: { id: disputeId },
      data: {
        status: "RESOLVED",
        resolution,
        note,
        resolvedById: adminId,
        resolvedAt: new Date(),
      },
      include: disputeInclude,
    });
  });
}
