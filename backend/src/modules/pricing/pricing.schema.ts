import { z } from "zod";

const ACTIVITY_IDS = ["rafting", "bungee", "camping", "yoga", "combo"] as const;

export const pricingQuerySchema = z.object({
  activity: z.enum(ACTIVITY_IDS, {
    errorMap: () => ({
      message: `activity must be one of: ${ACTIVITY_IDS.join(", ")}`,
    }),
  }),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be in YYYY-MM-DD format")
    .refine((d) => !isNaN(Date.parse(d)), "date must be a valid calendar date"),
});

export const monthInsightsQuerySchema = z.object({
  activity: z.enum(ACTIVITY_IDS),
  year: z.coerce.number().int().min(2024).max(2030),
  month: z.coerce.number().int().min(0).max(11),
});

export const trendQuerySchema = z.object({
  activity: z.enum(ACTIVITY_IDS),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  days: z.coerce.number().int().min(7).max(365).default(30),
});

export const recommendationQuerySchema = z.object({
  activity: z.enum(ACTIVITY_IDS),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  days: z.coerce.number().int().min(14).max(365).default(90),
});

export type PricingQuery = z.infer<typeof pricingQuerySchema>;
export type MonthInsightsQuery = z.infer<typeof monthInsightsQuerySchema>;
export type TrendQuery = z.infer<typeof trendQuerySchema>;
export type RecommendationQuery = z.infer<typeof recommendationQuerySchema>;
