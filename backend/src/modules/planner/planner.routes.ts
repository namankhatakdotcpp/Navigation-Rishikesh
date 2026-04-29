import type { FastifyInstance } from "fastify";
import { handlePostPlanner } from "./planner.controller";

export async function plannerRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post(
    "/planner",
    {
      schema: {
        tags: ["Planner"],
        summary: "Generate an optimised trip itinerary",
        description:
          "Returns a day-wise itinerary, accommodation recommendation, total cost range, and per-day experience picks based on the traveller's interests and budget tier.",
        body: {
          type: "object",
          properties: {
            startDate: {
              type: "string",
              pattern: "^\\d{4}-\\d{2}-\\d{2}$",
              description: "Trip start date (YYYY-MM-DD). Defaults to today.",
            },
            days: {
              type: "integer",
              minimum: 1,
              maximum: 14,
              default: 3,
              description: "Number of trip days",
            },
            budgetTier: {
              type: "string",
              enum: ["low", "mid", "high"],
              default: "mid",
              description:
                "low = budget (₹1200/night), mid = comfort (₹2200/night), high = boutique (₹4200/night)",
            },
            interests: {
              type: "array",
              items: {
                type: "string",
                enum: [
                  "adventure",
                  "nature",
                  "spiritual",
                  "wellness",
                  "culture",
                  "family",
                  "budget",
                ],
              },
              minItems: 1,
              default: ["nature", "spiritual"],
              description: "Traveller interests to personalise the itinerary",
            },
          },
        },
        response: {
          200: {
            description: "Generated trip plan",
            type: "object",
            properties: {
              success: { type: "boolean" },
              data: {
                type: "object",
                properties: {
                  totalCost: { type: "number" },
                  range: { type: "string" },
                  summary: { type: "string" },
                  budgetTier: { type: "string" },
                  stay: {
                    type: "object",
                    properties: {
                      label: { type: "string" },
                      perNight: { type: "number" },
                    },
                  },
                  itinerary: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string" },
                        dateLabel: { type: "string" },
                        theme: { type: "string" },
                        dayCost: { type: "number" },
                        items: { type: "array" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    handlePostPlanner
  );
}
