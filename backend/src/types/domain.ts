// SQLite has no native Prisma enum support, so these mirror the schema's
// string fields and are validated at the API boundary with Zod.

export type UserType = "POSTER" | "HELPER";
export type TaskStatus = "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED";
export type BidStatus = "PENDING" | "ACCEPTED" | "REJECTED";
export type WalletTxType = "DEPOSIT" | "WITHDRAW" | "ESCROW_HOLD" | "ESCROW_RELEASE" | "REFUND";
