import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/httpError.js";
import { notify } from "./notification.service.js";

const ESCROWED_STATUSES = ["IN_PROGRESS", "SUBMITTED", "DISPUTED"];

export async function getStats() {
  const [userCount, bannedCount, tasksByStatus, openDisputes, escrow] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isBanned: true } }),
    prisma.task.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.dispute.count({ where: { status: "OPEN" } }),
    prisma.task.aggregate({
      where: { status: { in: ESCROWED_STATUSES } },
      _sum: { acceptedAmount: true },
    }),
  ]);

  const taskCounts: Record<string, number> = {};
  for (const row of tasksByStatus) taskCounts[row.status] = row._count._all;

  return {
    users: userCount,
    bannedUsers: bannedCount,
    tasks: taskCounts,
    openDisputes,
    escrowHeld: escrow._sum.acceptedAmount ?? 0,
  };
}

export async function listUsers(search?: string) {
  return prisma.user.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {},
    select: {
      id: true,
      name: true,
      email: true,
      userType: true,
      isAdmin: true,
      isBanned: true,
      walletBalance: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function setBanned(targetUserId: number, banned: boolean, actingAdminId: number) {
  if (targetUserId === actingAdminId) throw new HttpError(400, "You can't ban yourself");

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) throw new HttpError(404, "User not found");
  if (target.isAdmin) throw new HttpError(403, "You can't ban another admin");

  await prisma.user.update({ where: { id: targetUserId }, data: { isBanned: banned } });
  return { id: targetUserId, isBanned: banned };
}

export async function listAllTasks(status?: string) {
  return prisma.task.findMany({
    where: status ? { status } : {},
    include: {
      category: true,
      poster: { select: { id: true, name: true } },
      helper: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

// Admin takedown: cancels the task and refunds any escrow back to the poster,
// closing an open dispute if one exists. Used for spam/abuse.
export async function removeTask(taskId: number) {
  return prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({ where: { id: taskId } });
    if (!task) throw new HttpError(404, "Task not found");
    if (task.status === "DONE" || task.status === "CANCELLED") {
      throw new HttpError(400, "This task is already closed");
    }

    if (ESCROWED_STATUSES.includes(task.status) && task.acceptedAmount) {
      await tx.user.update({
        where: { id: task.posterId },
        data: { walletBalance: { increment: task.acceptedAmount } },
      });
      await tx.walletTransaction.create({
        data: {
          userId: task.posterId,
          type: "REFUND",
          amount: task.acceptedAmount,
          note: `Admin removed task #${taskId} — escrow refunded`,
        },
      });
    }

    await tx.dispute.updateMany({
      where: { taskId, status: "OPEN" },
      data: { status: "RESOLVED", resolution: "REFUNDED", note: "Task removed by admin", resolvedAt: new Date() },
    });

    await notify(tx, task.posterId, `Your task "${task.title}" was removed by an administrator.`);
    if (task.helperId) {
      await notify(tx, task.helperId, `The task "${task.title}" was removed by an administrator.`);
    }

    return tx.task.update({ where: { id: taskId }, data: { status: "CANCELLED" } });
  });
}
