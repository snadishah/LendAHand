import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/httpError.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { getAverageRating, getReviewsForUser } from "../services/review.service.js";

const router = Router();

const updateMeSchema = z.object({
  name: z.string().min(3).optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
});

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

function publicUser(user: { id: number; name: string; email: string; userType: string; city: string | null; phone: string | null; walletBalance: number; createdAt: Date }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    userType: user.userType,
    city: user.city,
    phone: user.phone,
    walletBalance: user.walletBalance,
    createdAt: user.createdAt,
  };
}

router.patch(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = updateMeSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.city !== undefined ? { city: input.city } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
      },
    });
    res.json({ user: publicUser(user) });
  })
);

router.patch(
  "/me/password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = updatePasswordSchema.parse(req.body);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });

    const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!valid) throw new HttpError(401, "Current password is incorrect");

    const passwordHash = await bcrypt.hash(input.newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    res.status(204).end();
  })
);

router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, userType: true, city: true, createdAt: true },
    });
    if (!user) throw new HttpError(404, "User not found");

    const [rating, reviews] = await Promise.all([getAverageRating(id), getReviewsForUser(id)]);
    res.json({ user, rating, reviews });
  })
);

export default router;
