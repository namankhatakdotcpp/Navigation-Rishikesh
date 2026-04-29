import type { FastifyInstance } from "fastify";
import { weatherRoutes } from "../modules/weather/weather.routes";
import { pricingRoutes } from "../modules/pricing/pricing.routes";
import { plannerRoutes } from "../modules/planner/planner.routes";
import { galleryRoutes } from "../modules/gallery/gallery.routes";
import { reachRoutes } from "../modules/reach/reach.routes";

export async function registerRoutes(fastify: FastifyInstance): Promise<void> {
  await fastify.register(weatherRoutes);
  await fastify.register(pricingRoutes);
  await fastify.register(plannerRoutes);
  await fastify.register(galleryRoutes);
  await fastify.register(reachRoutes);
}
