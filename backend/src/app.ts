import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import * as Sentry from "@sentry/node";

import { env, isProduction } from "./env.js";
import { globalLimiter } from "./lib/rateLimit.js";
import authRoutes from "./routes/auth.routes.js";
import usersRoutes from "./routes/users.routes.js";
import categoriesRoutes from "./routes/categories.routes.js";
import tasksRoutes from "./routes/tasks.routes.js";
import bidsRoutes from "./routes/bids.routes.js";
import reviewsRoutes from "./routes/reviews.routes.js";
import walletRoutes from "./routes/wallet.routes.js";
import notificationsRoutes from "./routes/notifications.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import { HttpError } from "./lib/httpError.js";
import { errorHandler } from "./middleware/errorHandler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const app = express();

// Behind Render/Railway/Fly proxies: trust the first proxy so req.ip (used by
// rate limiting) and secure cookies work correctly.
app.set("trust proxy", 1);

// Security headers. The Content-Security-Policy is tuned for this app: the SPA
// and Leaflet need inline styles, and map tiles/marker images come from
// OpenStreetMap, so those origins are explicitly allowed.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "img-src": ["'self'", "data:", "https://*.tile.openstreetmap.org"],
        "connect-src": ["'self'"],
        "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
        "script-src": ["'self'"],
      },
    },
    // Leaflet tiles are cross-origin; the default same-origin policy blocks them.
    crossOriginEmbedderPolicy: false,
  })
);

// Explicit body-size cap so oversized payloads are rejected early.
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

// Lightweight health check for uptime monitors and load balancers.
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// Broad rate-limit backstop across the whole API.
app.use("/api", globalLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/bids", bidsRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/admin", adminRoutes);

// Unknown API routes should 404 as JSON, not fall through to the SPA handler.
app.use("/api", (_req, _res, next) => next(new HttpError(404, "Not found")));

if (isProduction) {
  const frontendDist = path.join(__dirname, "../../frontend/dist");
  app.use(express.static(frontendDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

// Capture unhandled errors in Sentry (only 5xx/unknown by default) before they
// reach our JSON error responder. No-op unless SENTRY_DSN is configured.
if (env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

app.use(errorHandler);
