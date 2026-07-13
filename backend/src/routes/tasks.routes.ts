import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import {
  createTask,
  listTasks,
  getMapTasks,
  getTasksForUser,
  getTaskById,
  cancelTask,
  submitTask,
  confirmTask,
} from "../services/task.service.js";
import { createBid, getBidsForTask, hasHelperBid } from "../services/bid.service.js";
import { getContactStatus, shareContact } from "../services/contact.service.js";
import { raiseDispute } from "../services/dispute.service.js";
import { hasReviewed } from "../services/review.service.js";

const router = Router();

const createTaskSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(4000),
  categoryId: z.number().int(),
  address: z.string().min(3).max(200),
  budget: z.number().positive(),
});

const createBidSchema = z.object({
  proposedAmount: z.number().positive(),
});

const disputeSchema = z.object({
  reason: z.string().min(5).max(1000),
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
    const userId = req.user!.id;
    const task = await getTaskById(id);

    const isOwner = task.posterId === userId;
    const isHelper = task.helperId === userId;
    const isParty = isOwner || isHelper;
    const alreadyBid = req.user!.userType === "HELPER" ? await hasHelperBid(id, userId) : false;
    const isEligibleToBid =
      req.user!.userType === "HELPER" && task.status === "OPEN" && !isOwner && !alreadyBid;

    const reviewed = isParty && task.status === "DONE" ? await hasReviewed(id, userId) : false;
    const openDispute =
      isParty && task.status === "DISPUTED"
        ? await prisma.dispute.findFirst({
            where: { taskId: id, status: "OPEN" },
            include: { raisedBy: { select: { id: true, name: true } } },
          })
        : null;

    res.json({
      task,
      isOwner,
      isHelper,
      isEligibleToBid,
      alreadyBid,
      canSubmit: isHelper && task.status === "IN_PROGRESS",
      canConfirm: isOwner && (task.status === "IN_PROGRESS" || task.status === "SUBMITTED"),
      canCancel: isOwner && (task.status === "OPEN" || task.status === "IN_PROGRESS"),
      canDispute: isParty && (task.status === "IN_PROGRESS" || task.status === "SUBMITTED"),
      canReview: isParty && task.status === "DONE" && !reviewed,
      hasReviewed: reviewed,
      openDispute,
    });
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
  "/:id/submit",
  requireAuth,
  requireRole("HELPER"),
  asyncHandler(async (req, res) => {
    const task = await submitTask(Number(req.params.id), req.user!.id);
    res.json({ task });
  })
);

router.patch(
  "/:id/done",
  requireAuth,
  requireRole("POSTER"),
  asyncHandler(async (req, res) => {
    const task = await confirmTask(Number(req.params.id), req.user!.id);
    res.json({ task });
  })
);

router.post(
  "/:id/dispute",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { reason } = disputeSchema.parse(req.body);
    const dispute = await raiseDispute(Number(req.params.id), req.user!.id, reason);
    res.status(201).json({ dispute });
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
