import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/httpError.js";

export async function getWalletSummary(userId: number) {
  const [user, transactions] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);
  return { balance: user.walletBalance, transactions };
}

export async function deposit(userId: number, amount: number) {
  if (amount <= 0) throw new HttpError(400, "Amount must be positive");

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: { walletBalance: { increment: amount } },
    });
    await tx.walletTransaction.create({
      data: { userId, type: "DEPOSIT", amount, note: "Wallet deposit" },
    });
    return user;
  });
}

export async function withdraw(userId: number, amount: number) {
  if (amount <= 0) throw new HttpError(400, "Amount must be positive");

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.walletBalance < amount) {
      throw new HttpError(400, "Insufficient wallet balance");
    }

    const updated = await tx.user.update({
      where: { id: userId },
      data: { walletBalance: { decrement: amount } },
    });
    await tx.walletTransaction.create({
      data: { userId, type: "WITHDRAW", amount, note: "Wallet withdrawal" },
    });
    return updated;
  });
}
