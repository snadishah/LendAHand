import type { NextFunction, Request, Response } from "express";
import type { UserType } from "../types/domain.js";
import { AUTH_COOKIE_NAME, verifyToken } from "../lib/jwt.js";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.id, userType: payload.userType };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
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
