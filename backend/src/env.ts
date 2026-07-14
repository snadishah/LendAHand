import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

// Central, validated environment. Importing this module first (see index.ts)
// guarantees the process fails fast with a clear message if anything required
// is missing or malformed, instead of blowing up deep inside a request later.
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required (a Postgres connection string)"),
  JWT_SECRET: z
    .string()
    .min(16, "JWT_SECRET must be set to a long random string (at least 16 characters)"),
  GEMINI_API_KEY: z.string().optional(),
  SENTRY_DSN: z.string().url().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("LendAHand <onboarding@resend.dev>"),
  APP_URL: z.string().url().default("http://localhost:5173"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
  console.error(`\n❌ Invalid environment configuration:\n${issues}\n`);
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";
