import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { listNotifications, unreadCount, markRead, markAllRead } from "../services/notification.service.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const unreadOnly = req.query.unread === "true";
    const notifications = await listNotifications(req.user!.id, unreadOnly);
    res.json({ notifications });
  })
);

router.get(
  "/unread-count",
  requireAuth,
  asyncHandler(async (req, res) => {
    const count = await unreadCount(req.user!.id);
    res.json({ count });
  })
);

router.patch(
  "/:id/read",
  requireAuth,
  asyncHandler(async (req, res) => {
    await markRead(req.user!.id, Number(req.params.id));
    res.status(204).end();
  })
);

router.patch(
  "/read-all",
  requireAuth,
  asyncHandler(async (req, res) => {
    await markAllRead(req.user!.id);
    res.status(204).end();
  })
);

export default router;
