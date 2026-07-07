import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/httpError.js";
import { getAverageRating } from "./review.service.js";
import { notify } from "./notification.service.js";

export async function createBid(taskId: number, helperId: number, proposedAmount: number) {
  if (proposedAmount <= 0) throw new HttpError(400, "Bid amount must be positive");

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new HttpError(404, "Task not found");
  if (task.status !== "OPEN") throw new HttpError(400, "This task is no longer open for bids");
  if (task.posterId === helperId) throw new HttpError(400, "You can't bid on your own task");

  const existing = await prisma.bid.findUnique({
    where: { taskId_helperId: { taskId, helperId } },
  });
  if (existing) throw new HttpError(409, "You've already placed a bid on this task");

  const bid = await prisma.bid.create({
    data: { taskId, helperId, proposedAmount },
  });

  await notify(prisma, task.posterId, `New bid of Rs. ${proposedAmount} received on "${task.title}".`);

  return bid;
}

export async function getBidsForTask(taskId: number, posterId: number) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new HttpError(404, "Task not found");
  if (task.posterId !== posterId) throw new HttpError(403, "Not your task");

  const bids = await prisma.bid.findMany({
    where: { taskId },
    include: { helper: { select: { id: true, name: true } } },
    orderBy: { proposedAmount: "asc" },
  });

  return Promise.all(
    bids.map(async (bid) => ({
      ...bid,
      helperRating: await getAverageRating(bid.helperId),
    }))
  );
}

export async function getBidsForHelper(helperId: number) {
  return prisma.bid.findMany({
    where: { helperId },
    include: { task: { include: { category: true, poster: { select: { id: true, name: true } } } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function hasHelperBid(taskId: number, helperId: number): Promise<boolean> {
  const existing = await prisma.bid.findUnique({
    where: { taskId_helperId: { taskId, helperId } },
  });
  return existing != null;
}

export async function acceptBid(bidId: number, posterId: number) {
  const { task, bid } = await prisma.$transaction(async (tx) => {
    const bid = await tx.bid.findUnique({ where: { id: bidId }, include: { task: true } });
    if (!bid) throw new HttpError(404, "Bid not found");
    if (bid.task.posterId !== posterId) throw new HttpError(403, "Not your task");
    if (bid.task.status !== "OPEN") throw new HttpError(400, "Task is not open");
    if (bid.status !== "PENDING") throw new HttpError(400, "Bid is no longer pending");

    const poster = await tx.user.findUniqueOrThrow({ where: { id: posterId } });
    if (poster.walletBalance < bid.proposedAmount) {
      throw new HttpError(400, "Insufficient wallet balance to accept this bid");
    }

    await tx.user.update({
      where: { id: posterId },
      data: { walletBalance: { decrement: bid.proposedAmount } },
    });
    await tx.walletTransaction.create({
      data: {
        userId: posterId,
        type: "ESCROW_HOLD",
        amount: bid.proposedAmount,
        note: `Held in escrow for task #${bid.taskId}`,
      },
    });

    await tx.bid.update({ where: { id: bid.id }, data: { status: "ACCEPTED" } });
    const rejected = await tx.bid.findMany({
      where: { taskId: bid.taskId, id: { not: bid.id } },
    });
    await tx.bid.updateMany({
      where: { taskId: bid.taskId, id: { not: bid.id } },
      data: { status: "REJECTED" },
    });

    const task = await tx.task.update({
      where: { id: bid.taskId },
      data: {
        status: "IN_PROGRESS",
        helperId: bid.helperId,
        acceptedAmount: bid.proposedAmount,
      },
      include: { category: true, poster: { select: { id: true, name: true } }, helper: { select: { id: true, name: true } } },
    });

    await notify(tx, bid.helperId, `Your bid on "${task.title}" was accepted! Time to get started.`);
    for (const other of rejected) {
      await notify(tx, other.helperId, `Your bid on "${task.title}" was not selected.`);
    }

    return { task, bid };
  });

  return { task, bid };
}
