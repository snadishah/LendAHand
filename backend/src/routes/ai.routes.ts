import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { aiLimiter } from "../lib/rateLimit.js";
import { getPriceEstimate, chatWithGemini, type ChatTurn } from "../lib/gemini.js";

const router = Router();

const estimateSchema = z.object({ description: z.string().min(5).max(2000) });
const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(z.object({ role: z.enum(["user", "model"]), text: z.string().max(4000) }))
    .max(20)
    .optional(),
});

router.post(
  "/price-estimate",
  requireAuth,
  aiLimiter,
  asyncHandler(async (req, res) => {
    const { description } = estimateSchema.parse(req.body);
    const estimate = await getPriceEstimate(description);
    res.json({ estimate });
  })
);

router.post(
  "/chat",
  requireAuth,
  aiLimiter,
  asyncHandler(async (req, res) => {
    const { message, history } = chatSchema.parse(req.body);
    const reply = await chatWithGemini(message, (history ?? []) as ChatTurn[]);
    res.json({ reply });
  })
);

export default router;
