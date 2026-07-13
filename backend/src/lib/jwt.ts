import jwt from "jsonwebtoken";
import { env } from "../env.js";
import type { UserType } from "../types/domain.js";

export interface AuthTokenPayload {
  id: number;
  userType: UserType;
}

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
}

export const AUTH_COOKIE_NAME = "token";
export const AUTH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
