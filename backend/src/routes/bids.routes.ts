import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { acceptBid, getBidsForHelper } from "../services/bid.service.js";

const router = Router();

router.get(
  "/mine",
  requireAuth,
  requireRole("HELPER"),
  asyncHandler(async (req, res) => {
    const bids = await getBidsForHelper(req.user!.id);
    res.json({ bids });
  })
);

router.patch(
  "/:id/accept",
  requireAuth,
  requireRole("POSTER"),
  asyncHandler(async (req, res) => {
    const result = await acceptBid(Number(req.params.id), req.user!.id);
    res.json(result);
  })
);

export default router;
