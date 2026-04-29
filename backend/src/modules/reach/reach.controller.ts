import type { FastifyReply, FastifyRequest } from "fastify";
import { getFlightReach, getRoadReach, getTrainReach } from "./reach.service";

export async function handleGetRoadReach(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const data = await getRoadReach();
  reply.status(200).send({ success: true, data });
}

export async function handleGetTrainReach(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const data = await getTrainReach();
  reply.status(200).send({ success: true, data });
}

export async function handleGetFlightReach(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const data = await getFlightReach();
  reply.status(200).send({ success: true, data });
}
