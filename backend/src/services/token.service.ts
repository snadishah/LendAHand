import crypto from "node:crypto";
import { prisma } from "../lib/prisma.js";

export type TokenType = "EMAIL_VERIFY" | "PASSWORD_RESET";

function hash(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

// Creates a single-use token: the raw value goes in the emailed link, only its
// hash is stored. Any prior unused tokens of the same type are invalidated.
export async function createToken(userId: number, type: TokenType, ttlMs: number): Promise<string> {
  const raw = crypto.randomBytes(32).toString("hex");
  await prisma.token.updateMany({
    where: { userId, type, usedAt: null },
    data: { usedAt: new Date() },
  });
  await prisma.token.create({
    data: { userId, type, tokenHash: hash(raw), expiresAt: new Date(Date.now() + ttlMs) },
  });
  return raw;
}

// Validates and consumes a token, returning the userId if it's valid, unused,
// and unexpired — otherwise null.
export async function consumeToken(raw: string, type: TokenType): Promise<number | null> {
  const token = await prisma.token.findUnique({ where: { tokenHash: hash(raw) } });
  if (!token || token.type !== type || token.usedAt || token.expiresAt < new Date()) {
    return null;
  }
  await prisma.token.update({ where: { id: token.id }, data: { usedAt: new Date() } });
  return token.userId;
}
