import { PrismaClient } from "@prisma/client";

// The money-moving flows (accept bid, confirm, dispute resolution) run several
// sequential queries in one interactive transaction. Against a remote Postgres
// (e.g. Neon) the per-query latency can exceed Prisma's default 5s limit, so we
// give transactions more headroom to avoid spurious P2028 timeouts.
export const prisma = new PrismaClient({
  transactionOptions: { maxWait: 10_000, timeout: 20_000 },
});
