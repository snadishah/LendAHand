import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { signToken, AUTH_COOKIE_NAME, AUTH_COOKIE_MAX_AGE_MS } from "../lib/jwt.js";
import { HttpError } from "../lib/httpError.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { authLimiter } from "../lib/rateLimit.js";
import { isProduction } from "../env.js";
import type { UserType } from "../types/domain.js";

const router = Router();

const STARTING_BALANCE = { POSTER: 200, HELPER: 50 } as const;

const registerSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  userType: z.enum(["POSTER", "HELPER"]),
  city: z.string().optional(),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function setAuthCookie(res: import("express").Response, token: string) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
  });
}

function publicUser(user: { id: number; name: string; email: string; userType: string; city: string | null; phone: string | null; walletBalance: number; isAdmin: boolean; createdAt: Date }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    userType: user.userType,
    city: user.city,
    phone: user.phone,
    walletBalance: user.walletBalance,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt,
  };
}

router.post(
  "/register",
  authLimiter,
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (existing) throw new HttpError(409, "An account with this email already exists");

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash,
        userType: input.userType,
        city: input.city,
        phone: input.phone,
        walletBalance: STARTING_BALANCE[input.userType],
      },
    });

    const token = signToken({ id: user.id, userType: user.userType as UserType });
    setAuthCookie(res, token);
    res.status(201).json({ user: publicUser(user) });
  })
);

router.post(
  "/login",
  authLimiter,
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (!user) throw new HttpError(401, "Invalid email or password");

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) throw new HttpError(401, "Invalid email or password");

    if (user.isBanned) throw new HttpError(403, "Your account has been suspended.");

    const token = signToken({ id: user.id, userType: user.userType as UserType });
    setAuthCookie(res, token);
    res.json({ user: publicUser(user) });
  })
);

router.post("/logout", (req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME);
  res.status(204).end();
});

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
    res.json({ user: publicUser(user) });
  })
);

export default router;
