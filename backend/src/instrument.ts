import * as Sentry from "@sentry/node";
import { env } from "./env.js";

// Error tracking. This module is imported first in index.ts (before Express) so
// Sentry can instrument the app. It's a no-op unless SENTRY_DSN is configured,
// so local development without a DSN behaves exactly as before.
if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    // Sample a fraction of requests for performance tracing; errors are always
    // captured regardless of this rate.
    tracesSampleRate: 0.1,
  });
}
