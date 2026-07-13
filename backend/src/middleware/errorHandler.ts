import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../lib/httpError.js";

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({ error: err.issues[0]?.message ?? "Invalid input" });
  }

  // body-parser / http-errors (e.g. payload too large, malformed JSON) carry a
  // numeric status and an `expose` flag for client-safe messages.
  if (err && typeof err === "object" && "status" in err) {
    const status = Number((err as { status: unknown }).status);
    if (Number.isInteger(status) && status >= 400 && status < 500) {
      const message =
        (err as { expose?: boolean }).expose && "message" in err
          ? String((err as { message: unknown }).message)
          : "Invalid request";
      return res.status(status).json({ error: message });
    }
  }

  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
}
