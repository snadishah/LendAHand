import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { getWalletSummary, deposit, withdraw } from "../services/wallet.service.js";

const router = Router();

const amountSchema = z.object({ amount: z.number().positive() });

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const summary = await getWalletSummary(req.user!.id);
    res.json(summary);
  })
);

router.post(
  "/deposit",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { amount } = amountSchema.parse(req.body);
    const user = await deposit(req.user!.id, amount);
    res.json({ balance: user.walletBalance });
  })
);

router.post(
  "/withdraw",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { amount } = amountSchema.parse(req.body);
    const user = await withdraw(req.user!.id, amount);
    res.json({ balance: user.walletBalance });
  })
);

export default router;
