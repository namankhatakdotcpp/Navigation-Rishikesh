import type { FastifyInstance } from "fastify";
import {
  handleGetDayPricing,
  handleGetMonthInsights,
  handleGetRecommendation,
  handleGetSlots,
  handleGetTrend,
} from "./pricing.controller";

const ACTIVITY_ENUM = ["rafting", "bungee", "camping", "yoga", "combo"];

export async function pricingRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/pricing?activity=rafting&date=2026-05-01
  fastify.get(
    "/pricing",
    {
      schema: {
        tags: ["Pricing"],
        summary: "Get demand-based pricing for a single date",
        description:
          "Returns the full demand score, fair price, price range, slot availability, weather impact, and vendor signal for an activity on a specific date. No date-range restriction — any valid future date is accepted.",
        querystring: {
          type: "object",
          required: ["activity", "date"],
          properties: {
            activity: { type: "string", enum: ACTIVITY_ENUM },
            date: {
              type: "string",
              pattern: "^\\d{4}-\\d{2}-\\d{2}$",
              description: "YYYY-MM-DD",
            },
          },
        },
      },
    },
    handleGetDayPricing
  );

  // GET /api/pricing/month?activity=rafting&year=2026&month=4
  fastify.get(
    "/pricing/month",
    {
      schema: {
        tags: ["Pricing"],
        summary: "Get pricing for every day in a calendar month",
        querystring: {
          type: "object",
          required: ["activity", "year", "month"],
          properties: {
            activity: { type: "string", enum: ACTIVITY_ENUM },
            year: { type: "integer", minimum: 2024, maximum: 2030 },
            month: { type: "integer", minimum: 0, maximum: 11, description: "0-indexed (January = 0)" },
          },
        },
      },
    },
    handleGetMonthInsights
  );

  // GET /api/pricing/slots?activity=rafting
  fastify.get(
    "/pricing/slots",
    {
      schema: {
        tags: ["Pricing"],
        summary: "Get slot schedule for an activity",
        querystring: {
          type: "object",
          required: ["activity"],
          properties: {
            activity: { type: "string", enum: ACTIVITY_ENUM },
          },
        },
      },
    },
    handleGetSlots
  );

  // GET /api/pricing/trend?activity=rafting&days=30
  fastify.get(
    "/pricing/trend",
    {
      schema: {
        tags: ["Pricing"],
        summary: "Get 7–365 day price trend data for Chart.js",
        querystring: {
          type: "object",
          required: ["activity"],
          properties: {
            activity: { type: "string", enum: ACTIVITY_ENUM },
            startDate: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
            days: { type: "integer", minimum: 7, maximum: 365, default: 30 },
          },
        },
      },
    },
    handleGetTrend
  );

  // GET /api/pricing/recommendation?activity=rafting&days=90
  fastify.get(
    "/pricing/recommendation",
    {
      schema: {
        tags: ["Pricing"],
        summary: "Get cheapest / peak / best-weather date recommendation over a window",
        querystring: {
          type: "object",
          required: ["activity"],
          properties: {
            activity: { type: "string", enum: ACTIVITY_ENUM },
            startDate: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
            days: { type: "integer", minimum: 14, maximum: 365, default: 90 },
          },
        },
      },
    },
    handleGetRecommendation
  );
}
