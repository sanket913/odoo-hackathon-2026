import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().min(1),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
  JWT_ACCESS_SECRET: z.string().min(16).default("dev-access-secret-change-me"),
  JWT_REFRESH_SECRET: z.string().min(16).default("dev-refresh-secret-change-me"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  COOKIE_SECURE: z.coerce.boolean().default(false),
  UPLOAD_DIR: z.string().default("uploads"),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().default(5),
  GROQ_API_KEY: z.string().optional().default(""),
  GROQ_MODEL: z.string().optional().default("llama-3.1-8b-instant"),
  LOG_LEVEL: z.string().default("info")
});

export const env = envSchema.parse(process.env);
export const corsOrigins = env.CORS_ORIGINS.split(",").map((x) => x.trim()).filter(Boolean);
