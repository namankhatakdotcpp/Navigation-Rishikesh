import type { FastifyReply, FastifyRequest } from "fastify";
import { plannerBodySchema } from "./planner.schema";
import { buildTripPlan } from "./planner.service";

export async function handlePostPlanner(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const input = plannerBodySchema.parse(request.body);
  const data = buildTripPlan(input);
  reply.status(200).send({ success: true, data });
}
