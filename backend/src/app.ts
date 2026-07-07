import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.routes.js";
import usersRoutes from "./routes/users.routes.js";
import categoriesRoutes from "./routes/categories.routes.js";
import tasksRoutes from "./routes/tasks.routes.js";
import bidsRoutes from "./routes/bids.routes.js";
import reviewsRoutes from "./routes/reviews.routes.js";
import walletRoutes from "./routes/wallet.routes.js";
import notificationsRoutes from "./routes/notifications.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const app = express();

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/bids", bidsRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/ai", aiRoutes);

if (process.env.NODE_ENV === "production") {
  const frontendDist = path.join(__dirname, "../../frontend/dist");
  app.use(express.static(frontendDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

app.use(errorHandler);
