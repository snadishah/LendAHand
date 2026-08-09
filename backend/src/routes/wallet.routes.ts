import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError } from "../lib/httpError.js";
import { getWalletSummary } from "../services/wallet.service.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const summary = await getWalletSummary(req.user!.id);
    res.json(summary);
  })
);

// Deposits & withdrawals are disabled until a real payment gateway is wired up.
// Returned as explicit 403s so no one can mint balance via the API directly.
// (The deposit/withdraw services still exist in wallet.service.ts for re-enable.)
const notAvailable = asyncHandler(async () => {
  throw new HttpError(403, "Deposits and withdrawals aren't available yet — coming soon.");
});
router.post("/deposit", requireAuth, notAvailable);
router.post("/withdraw", requireAuth, notAvailable);

export default router;
