import type { FastifyReply, FastifyRequest } from "fastify";
import {
  monthInsightsQuerySchema,
  pricingQuerySchema,
  recommendationQuerySchema,
  trendQuerySchema,
} from "./pricing.schema";
import {
  getDayPricing,
  getMonthPricing,
  getRecommendation,
  getSlotSchedule,
  getTrend,
} from "./pricing.service";
import type { ActivityId } from "./pricing.types";

export async function handleGetDayPricing(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { activity, date } = pricingQuerySchema.parse(request.query);
  const data = await getDayPricing(activity as ActivityId, date);
  reply.status(200).send({ success: true, data });
}

export async function handleGetMonthInsights(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { activity, year, month } = monthInsightsQuerySchema.parse(request.query);
  const data = await getMonthPricing(activity as ActivityId, year, month);
  reply.status(200).send({ success: true, data });
}

export async function handleGetSlots(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { activity } = pricingQuerySchema
    .pick({ activity: true })
    .parse(request.query);
  const data = getSlotSchedule(activity as ActivityId);
  reply.status(200).send({ success: true, data });
}

export async function handleGetTrend(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { activity, startDate, days } = trendQuerySchema.parse(request.query);
  const start = startDate ?? new Date().toISOString().split("T")[0]!;
  const data = await getTrend(activity as ActivityId, start, days);
  reply.status(200).send({ success: true, data });
}

export async function handleGetRecommendation(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { activity, startDate, days } = recommendationQuerySchema.parse(request.query);
  const start = startDate ?? new Date().toISOString().split("T")[0]!;
  const data = await getRecommendation(activity as ActivityId, start, days);
  reply.status(200).send({ success: true, data });
}
