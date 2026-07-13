import rateLimit, { type Options } from "express-rate-limit";

// Shared config: return errors in the same `{ error }` shape the rest of the API
// uses, and rely on Express `trust proxy` (set in app.ts) for correct client IPs
// behind Render/Railway's proxy.
function makeLimiter(windowMs: number, limit: number, message: string): ReturnType<typeof rateLimit> {
  const options: Partial<Options> = {
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({ error: message }),
  };
  return rateLimit(options);
}

// Broad backstop for the whole API — high enough to never bother real users.
export const globalLimiter = makeLimiter(
  60 * 1000,
  300,
  "Too many requests. Please slow down and try again in a minute."
);

// Login / register / password endpoints — tight, to blunt brute-force and
// credential-stuffing attempts.
export const authLimiter = makeLimiter(
  15 * 60 * 1000,
  20,
  "Too many attempts. Please wait a few minutes and try again."
);

// AI endpoints hit a paid third-party (Gemini); cap them per user/IP so one
// account can't burn the quota or run up cost.
export const aiLimiter = makeLimiter(
  60 * 60 * 1000,
  40,
  "You've reached the AI usage limit for now. Please try again later."
);
