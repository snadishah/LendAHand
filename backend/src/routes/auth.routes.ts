import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { signToken, AUTH_COOKIE_NAME, AUTH_COOKIE_MAX_AGE_MS } from "../lib/jwt.js";
import { HttpError } from "../lib/httpError.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { authLimiter } from "../lib/rateLimit.js";
import { isProduction, env } from "../env.js";
import { createToken, consumeToken } from "../services/token.service.js";
import { queueUserEmail } from "../services/email.service.js";
import { welcomeEmail, verifyEmail, passwordResetEmail } from "../lib/emailTemplates.js";
import type { UserType } from "../types/domain.js";

const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

// Queues the welcome + verification emails for a newly registered user. Never
// throws — email issues must not break signup.
async function sendSignupEmails(userId: number, name: string, userType: UserType) {
  try {
    const raw = await createToken(userId, "EMAIL_VERIFY", EMAIL_VERIFY_TTL_MS);
    const link = `${env.APP_URL}/verify-email?token=${raw}`;
    await queueUserEmail(prisma, userId, () => welcomeEmail(name, userType, env.APP_URL));
    await queueUserEmail(prisma, userId, () => verifyEmail(name, link));
  } catch (err) {
    console.error("Failed to queue signup emails", err);
  }
}

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

    await sendSignupEmails(user.id, user.name, user.userType as UserType);

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

const verifyEmailSchema = z.object({ token: z.string().min(1) });

router.post(
  "/verify-email",
  asyncHandler(async (req, res) => {
    const { token } = verifyEmailSchema.parse(req.body);
    const userId = await consumeToken(token, "EMAIL_VERIFY");
    if (!userId) throw new HttpError(400, "This verification link is invalid or has expired.");
    await prisma.user.update({ where: { id: userId }, data: { emailVerified: true } });
    res.json({ ok: true });
  })
);

router.post(
  "/resend-verification",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
    if (user.emailVerified) return res.json({ ok: true, alreadyVerified: true });

    const raw = await createToken(user.id, "EMAIL_VERIFY", EMAIL_VERIFY_TTL_MS);
    const link = `${env.APP_URL}/verify-email?token=${raw}`;
    await queueUserEmail(prisma, user.id, () => verifyEmail(user.name, link));
    res.json({ ok: true });
  })
);

const forgotSchema = z.object({ email: z.string().email() });

router.post(
  "/forgot-password",
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email } = forgotSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    // Always respond the same way so we don't reveal whether an email is registered.
    if (user && !user.isBanned) {
      const raw = await createToken(user.id, "PASSWORD_RESET", PASSWORD_RESET_TTL_MS);
      const link = `${env.APP_URL}/reset-password?token=${raw}`;
      await queueUserEmail(prisma, user.id, () => passwordResetEmail(user.name, link));
    }
    res.json({ ok: true });
  })
);

const resetSchema = z.object({ token: z.string().min(1), newPassword: z.string().min(6) });

router.post(
  "/reset-password",
  authLimiter,
  asyncHandler(async (req, res) => {
    const { token, newPassword } = resetSchema.parse(req.body);
    const userId = await consumeToken(token, "PASSWORD_RESET");
    if (!userId) throw new HttpError(400, "This reset link is invalid or has expired.");
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    res.json({ ok: true });
  })
);

export default router;
