import type { FastifyReply, FastifyRequest } from "fastify";
import { weatherQuerySchema } from "./weather.schema";
import { getWeather } from "./weather.service";

export async function handleGetWeather(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const query = weatherQuerySchema.parse(request.query);
  const result = await getWeather(query.city);
  reply.status(200).send(result);
}
