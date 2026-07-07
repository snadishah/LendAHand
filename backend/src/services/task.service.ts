import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/httpError.js";
import { geocodeAddress } from "../lib/geocode.js";
import { haversineDistanceKm } from "../lib/distance.js";
import { notify } from "./notification.service.js";

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

export async function markTaskDone(taskId: number, posterId: number) {
  return prisma.$transaction(async (tx) => {
    const task = await tx.task.findUniqueOrThrow({ where: { id: taskId } });
    if (task.posterId !== posterId) throw new HttpError(403, "Not your task");
    if (task.status !== "IN_PROGRESS" || !task.helperId || !task.acceptedAmount) {
      throw new HttpError(400, "Task is not in progress");
    }

    await tx.user.update({
      where: { id: task.helperId },
      data: { walletBalance: { increment: task.acceptedAmount } },
    });
    await tx.walletTransaction.create({
      data: {
        userId: task.helperId,
        type: "ESCROW_RELEASE",
        amount: task.acceptedAmount,
        note: `Payment released for task #${taskId}`,
      },
    });

    await notify(tx, task.helperId, `You've been paid Rs. ${task.acceptedAmount} for completing "${task.title}"!`);

    return tx.task.update({
      where: { id: taskId },
      data: { status: "DONE" },
      include: taskInclude,
    });
  });
}
