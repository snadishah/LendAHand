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

export async function hasReviewed(taskId: number, reviewerId: number): Promise<boolean> {
  const existing = await prisma.review.findUnique({
    where: { taskId_reviewerId: { taskId, reviewerId } },
  });
  return existing != null;
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
  if (task.status !== "DONE" || !task.helperId) {
    throw new HttpError(400, "Task must be completed before it can be reviewed");
  }

  // Either party on a completed task can review the other one time.
  const isPoster = task.posterId === reviewerId;
  const isHelper = task.helperId === reviewerId;
  if (!isPoster && !isHelper) {
    throw new HttpError(403, "Only the people involved in this task can review it");
  }
  const revieweeId = isPoster ? task.helperId : task.posterId;

  const existing = await prisma.review.findUnique({
    where: { taskId_reviewerId: { taskId: input.taskId, reviewerId } },
  });
  if (existing) throw new HttpError(409, "You've already reviewed this task");

  return prisma.review.create({
    data: {
      taskId: input.taskId,
      reviewerId,
      revieweeId,
      rating: input.rating,
      comment: input.comment,
    },
  });
}
