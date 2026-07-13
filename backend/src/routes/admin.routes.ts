import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { getStats, listUsers, setBanned, listAllTasks, removeTask } from "../services/admin.service.js";
import { listDisputes, resolveDispute } from "../services/dispute.service.js";

const router = Router();

// Every admin route requires an authenticated admin account.
router.use(requireAuth, requireAdmin);

const banSchema = z.object({ banned: z.boolean() });
const resolveSchema = z.object({
  resolution: z.enum(["RELEASED", "REFUNDED"]),
  note: z.string().max(1000).optional(),
});

router.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    res.json(await getStats());
  })
);

router.get(
  "/users",
  asyncHandler(async (req, res) => {
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    res.json({ users: await listUsers(search) });
  })
);

router.patch(
  "/users/:id/ban",
  asyncHandler(async (req, res) => {
    const { banned } = banSchema.parse(req.body);
    const result = await setBanned(Number(req.params.id), banned, req.user!.id);
    res.json(result);
  })
);

router.get(
  "/tasks",
  asyncHandler(async (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    res.json({ tasks: await listAllTasks(status) });
  })
);

router.patch(
  "/tasks/:id/remove",
  asyncHandler(async (req, res) => {
    const task = await removeTask(Number(req.params.id));
    res.json({ task });
  })
);

router.get(
  "/disputes",
  asyncHandler(async (req, res) => {
    const status = req.query.status === "RESOLVED" ? "RESOLVED" : req.query.status === "OPEN" ? "OPEN" : undefined;
    res.json({ disputes: await listDisputes(status) });
  })
);

router.post(
  "/disputes/:id/resolve",
  asyncHandler(async (req, res) => {
    const { resolution, note } = resolveSchema.parse(req.body);
    const dispute = await resolveDispute(Number(req.params.id), req.user!.id, resolution, note);
    res.json({ dispute });
  })
);

export default router;
