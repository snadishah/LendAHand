import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/httpError.js";
import { notify } from "./notification.service.js";

async function getTaskForContact(taskId: number, userId: number) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new HttpError(404, "Task not found");
  if (task.posterId !== userId && task.helperId !== userId) {
    throw new HttpError(403, "Not part of this task");
  }
  if (task.status !== "IN_PROGRESS" && task.status !== "DONE") {
    throw new HttpError(400, "Contact sharing is only available once a helper is assigned");
  }
  const otherUserId = task.posterId === userId ? task.helperId! : task.posterId;
  return { task, otherUserId };
}

async function buildContactStatus(taskId: number, userId: number, otherUserId: number) {
  const [mine, theirs] = await Promise.all([
    prisma.contactShare.findUnique({ where: { taskId_userId: { taskId, userId } } }),
    prisma.contactShare.findUnique({ where: { taskId_userId: { taskId, userId: otherUserId } } }),
  ]);

  const other = theirs
    ? await prisma.user.findUnique({
        where: { id: otherUserId },
        select: { name: true, email: true, phone: true },
      })
    : null;

  return { myShared: mine != null, otherShared: other != null, other };
}

export async function getContactStatus(taskId: number, userId: number) {
  const { otherUserId } = await getTaskForContact(taskId, userId);
  return buildContactStatus(taskId, userId, otherUserId);
}

export async function shareContact(taskId: number, userId: number) {
  const { task, otherUserId } = await getTaskForContact(taskId, userId);

  await prisma.contactShare.upsert({
    where: { taskId_userId: { taskId, userId } },
    create: { taskId, userId },
    update: {},
  });

  const sharer = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true },
  });
  await notify(
    prisma,
    otherUserId,
    `${sharer.name} shared their contact info with you for "${task.title}". You can now view it on the task page.`
  );

  return buildContactStatus(taskId, userId, otherUserId);
}
