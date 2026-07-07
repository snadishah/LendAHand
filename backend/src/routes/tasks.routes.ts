import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  createTask,
  listTasks,
  getMapTasks,
  getTasksForUser,
  getTaskById,
  cancelTask,
  markTaskDone,
} from "../services/task.service.js";
import { createBid, getBidsForTask, hasHelperBid } from "../services/bid.service.js";
import { getContactStatus, shareContact } from "../services/contact.service.js";

const router = Router();

const createTaskSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  categoryId: z.number().int(),
  address: z.string().min(3),
  budget: z.number().positive(),
});

const createBidSchema = z.object({
  proposedAmount: z.number().positive(),
});

router.post(
  "/",
  requireAuth,
  requireRole("POSTER"),
  asyncHandler(async (req, res) => {
    const input = createTaskSchema.parse(req.body);
    const task = await createTask(req.user!.id, input);
    res.status(201).json({ task });
  })
);

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
    const near = typeof req.query.near === "string" ? req.query.near : undefined;
    const status = typeof req.query.status === "string" ? (req.query.status as "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED") : undefined;
    const tasks = await listTasks({ categoryId, near, status });
    res.json({ tasks });
  })
);

router.get(
  "/mine",
  requireAuth,
  asyncHandler(async (req, res) => {
    const tab = req.query.tab === "helping" ? "helping" : "posted";
    const tasks = await getTasksForUser(req.user!.id, tab);
    res.json({ tasks });
  })
);

router.get(
  "/map",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const tasks = await getMapTasks();
    res.json({ tasks });
  })
);

router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const task = await getTaskById(id);

    const isOwner = task.posterId === req.user!.id;
    const alreadyBid = req.user!.userType === "HELPER" ? await hasHelperBid(id, req.user!.id) : false;
    const isEligibleToBid =
      req.user!.userType === "HELPER" && task.status === "OPEN" && !isOwner && !alreadyBid;

    res.json({ task, isOwner, isEligibleToBid, alreadyBid });
  })
);

router.patch(
  "/:id/cancel",
  requireAuth,
  requireRole("POSTER"),
  asyncHandler(async (req, res) => {
    const task = await cancelTask(Number(req.params.id), req.user!.id);
    res.json({ task });
  })
);

router.patch(
  "/:id/done",
  requireAuth,
  requireRole("POSTER"),
  asyncHandler(async (req, res) => {
    const task = await markTaskDone(Number(req.params.id), req.user!.id);
    res.json({ task });
  })
);

router.post(
  "/:id/bids",
  requireAuth,
  requireRole("HELPER"),
  asyncHandler(async (req, res) => {
    const { proposedAmount } = createBidSchema.parse(req.body);
    const bid = await createBid(Number(req.params.id), req.user!.id, proposedAmount);
    res.status(201).json({ bid });
  })
);

router.get(
  "/:id/bids",
  requireAuth,
  requireRole("POSTER"),
  asyncHandler(async (req, res) => {
    const bids = await getBidsForTask(Number(req.params.id), req.user!.id);
    res.json({ bids });
  })
);

router.get(
  "/:id/contact",
  requireAuth,
  asyncHandler(async (req, res) => {
    const status = await getContactStatus(Number(req.params.id), req.user!.id);
    res.json(status);
  })
);

router.post(
  "/:id/contact/share",
  requireAuth,
  asyncHandler(async (req, res) => {
    const status = await shareContact(Number(req.params.id), req.user!.id);
    res.json(status);
  })
);

export default router;
