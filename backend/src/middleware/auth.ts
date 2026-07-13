import type { NextFunction, Request, Response } from "express";
import type { UserType } from "../types/domain.js";
import { AUTH_COOKIE_NAME, verifyToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";

// Verifies the session token AND re-checks the account against the database on
// every request, so a banned or deleted user loses access immediately rather
// than staying valid until their 7-day token expires.
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, userType: true, isAdmin: true, isBanned: true },
    });
    if (!user) {
      return res.status(401).json({ error: "Account no longer exists" });
    }
    if (user.isBanned) {
      return res.status(403).json({ error: "Your account has been suspended." });
    }

    req.user = { id: user.id, userType: user.userType as UserType, isAdmin: user.isAdmin };
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(role: UserType) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (req.user.userType !== role) {
      return res.status(403).json({ error: `Only ${role.toLowerCase()}s can do this` });
    }
    next();
  };
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}
