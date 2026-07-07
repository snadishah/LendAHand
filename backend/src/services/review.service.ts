import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/httpError.js";

export async function getAverageRating(userId: number): Promise<{ average: number | null; count: number }> {
  const agg = await prisma.review.aggregate({
    where: { revieweeId: userId },
    _avg: { rating: true },
    _count: { rating: true },
  });
  return { average: agg._avg.rating, count: agg._count.rating };
}

export async function getReviewsForUser(userId: number) {
  return prisma.review.findMany({
    where: { revieweeId: userId },
    include: { reviewer: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export interface CreateReviewInput {
  taskId: number;
  rating: number;
  comment?: string;
}

export async function createReview(reviewerId: number, input: CreateReviewInput) {
  if (input.rating < 1 || input.rating > 5) {
    throw new HttpError(400, "Rating must be between 1 and 5");
  }

  const task = await prisma.task.findUnique({ where: { id: input.taskId } });
  if (!task) throw new HttpError(404, "Task not found");
  if (task.posterId !== reviewerId) throw new HttpError(403, "Only the task poster can leave this review");
  if (task.status !== "DONE" || !task.helperId) {
    throw new HttpError(400, "Task must be completed before it can be reviewed");
  }

  const existing = await prisma.review.findUnique({
    where: { taskId_reviewerId: { taskId: input.taskId, reviewerId } },
  });
  if (existing) throw new HttpError(409, "You've already reviewed this task");

  return prisma.review.create({
    data: {
      taskId: input.taskId,
      reviewerId,
      revieweeId: task.helperId,
      rating: input.rating,
      comment: input.comment,
    },
  });
}
