import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/httpError.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { getAverageRating, getReviewsForUser } from "../services/review.service.js";
import { verifyUnsubscribeToken } from "../services/email.service.js";

const router = Router();

const updateMeSchema = z.object({
  name: z.string().min(3).optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  emailOptOut: z.boolean().optional(),
});

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

function publicUser(user: { id: number; name: string; email: string; userType: string; city: string | null; phone: string | null; walletBalance: number; isAdmin: boolean; emailVerified: boolean; emailOptOut: boolean; createdAt: Date }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    userType: user.userType,
    city: user.city,
    phone: user.phone,
    walletBalance: user.walletBalance,
    isAdmin: user.isAdmin,
    emailVerified: user.emailVerified,
    emailOptOut: user.emailOptOut,
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
        ...(input.emailOptOut !== undefined ? { emailOptOut: input.emailOptOut } : {}),
      },
    });
    res.json({ user: publicUser(user) });
  })
);

const unsubscribeSchema = z.object({ token: z.string().min(1) });

// One-click unsubscribe from a signed email link — no login required.
router.post(
  "/unsubscribe",
  asyncHandler(async (req, res) => {
    const { token } = unsubscribeSchema.parse(req.body);
    const userId = verifyUnsubscribeToken(token);
    if (!userId) throw new HttpError(400, "This unsubscribe link is invalid.");
    await prisma.user.update({ where: { id: userId }, data: { emailOptOut: true } });
    res.json({ ok: true });
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
