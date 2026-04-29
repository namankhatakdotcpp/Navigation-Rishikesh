import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default("0.0.0.0"),

  ALLOWED_ORIGINS: z
    .string()
    .default("http://localhost:3000,http://127.0.0.1:5500")
    .transform((val) => val.split(",").map((s) => s.trim())),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),

  WEATHERSTACK_API_KEY: z.string().min(1),
  WEATHERSTACK_API_BASE_URL: z
    .string()
    .url()
    .default("http://api.weatherstack.com/current"),
  WEATHERSTACK_QUERY: z.string().default("Rishikesh,India"),
  WEATHER_CACHE_TTL_SECONDS: z.coerce.number().default(900),

  GOOGLE_MAPS_API_KEY: z.string().optional(),
  ORS_API_KEY: z.string().optional(),

  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),

  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("7d"),

  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌  Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
export type Config = typeof config;
