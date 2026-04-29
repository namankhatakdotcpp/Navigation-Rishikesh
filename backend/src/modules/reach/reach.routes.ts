import type { FastifyInstance } from "fastify";
import {
  handleGetFlightReach,
  handleGetRoadReach,
  handleGetTrainReach,
} from "./reach.controller";

const reachSchema = (mode: string, summary: string) => ({
  tags: ["Reach"],
  summary,
  description:
    "Returns route intelligence, ETA, tips, and transport options for reaching Rishikesh. " +
    "Road uses live ORS ETA if ORS_API_KEY is configured, otherwise falls back to curated static data. " +
    "Responses are cached in Redis for 1 hour.",
  response: {
    200: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        data: {
          type: "object",
          properties: {
            mode: { type: "string", enum: [mode] },
          },
        },
      },
    },
  },
});

export async function reachRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    "/reach/road",
    { schema: reachSchema("road", "Get road route intelligence from Delhi to Rishikesh") },
    handleGetRoadReach
  );

  fastify.get(
    "/reach/train",
    { schema: reachSchema("train", "Get train options to the nearest junction (Haridwar HW)") },
    handleGetTrainReach
  );

  fastify.get(
    "/reach/flight",
    { schema: reachSchema("flight", "Get flight & taxi info via Jolly Grant Airport (DED)") },
    handleGetFlightReach
  );
}
