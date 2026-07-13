import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { createReview } from "../services/review.service.js";

const router = Router();

const createReviewSchema = z.object({
  taskId: z.number().int(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = createReviewSchema.parse(req.body);
    const review = await createReview(req.user!.id, input);
    res.status(201).json({ review });
  })
);

export default router;
