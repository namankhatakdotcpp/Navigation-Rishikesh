import { z } from "zod";

const INTERESTS = [
  "adventure",
  "nature",
  "spiritual",
  "wellness",
  "culture",
  "family",
  "budget",
] as const;

export const plannerBodySchema = z.object({
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "startDate must be in YYYY-MM-DD format")
    .refine((d) => !isNaN(Date.parse(d)), "startDate must be a valid calendar date")
    .default(() => new Date().toISOString().split("T")[0]!),

  days: z
    .number()
    .int()
    .min(1, "Minimum 1 day")
    .max(14, "Maximum 14 days")
    .default(3),

  budgetTier: z
    .enum(["low", "mid", "high"], {
      errorMap: () => ({ message: "budgetTier must be 'low', 'mid', or 'high'" }),
    })
    .default("mid"),

  interests: z
    .array(z.enum(INTERESTS))
    .min(1, "At least one interest is required")
    .max(7)
    .default(["nature", "spiritual"]),
});

export type PlannerBody = z.infer<typeof plannerBodySchema>;
