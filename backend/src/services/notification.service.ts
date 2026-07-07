import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

type TxClient = Prisma.TransactionClient | PrismaClient;

export async function notify(client: TxClient, userId: number, message: string) {
  await client.notification.create({ data: { userId, message } });
}

export async function listNotifications(userId: number, unreadOnly: boolean) {
  return prisma.notification.findMany({
    where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function unreadCount(userId: number) {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

export async function markRead(userId: number, notificationId: number) {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });
}

export async function markAllRead(userId: number) {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}
