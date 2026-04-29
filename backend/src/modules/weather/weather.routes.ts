import type { FastifyInstance } from "fastify";
import { handleGetWeather } from "./weather.controller";

export async function weatherRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    "/weather",
    {
      schema: {
        tags: ["Weather"],
        summary: "Get current weather for Rishikesh",
        description:
          "Returns real-time weather data proxied from Weatherstack (cached 15 min). Falls back to a deterministic mock if the upstream API is unavailable.",
        querystring: {
          type: "object",
          properties: {
            city: {
              type: "string",
              default: "Rishikesh",
              description: "City name to query (currently only Rishikesh is supported)",
            },
          },
        },
        response: {
          200: {
            description: "Weather data",
            type: "object",
            properties: {
              success: { type: "boolean" },
              data: {
                type: "object",
                properties: {
                  source: { type: "string", enum: ["live", "mock"] },
                  location: { type: "string" },
                  condition: { type: "string" },
                  label: { type: "string" },
                  temperature: { type: "number" },
                  feelsLike: { type: "number" },
                  windSpeed: { type: "number" },
                  humidity: { type: "number" },
                  travelAdvice: { type: "string" },
                  demandModifier: { type: "number" },
                  priceModifier: { type: "number" },
                  cachedAt: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    handleGetWeather
  );
}
