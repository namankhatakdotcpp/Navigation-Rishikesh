import type { FastifyInstance } from "fastify";
import { handleGetGallery } from "./gallery.controller";

export async function galleryRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    "/gallery",
    {
      schema: {
        tags: ["Gallery"],
        summary: "Get gallery images",
        description:
          "Returns structured image metadata from the /assets directory. " +
          "Pass ?category=rafting for a single section, or omit for all sections. " +
          "Image URLs point to the /assets static endpoint served by this API.",
        querystring: {
          type: "object",
          properties: {
            category: {
              type: "string",
              description:
                "Directory slug under /assets (e.g. rafting, lakshman-jhula, camping). Omit for all categories.",
            },
          },
        },
        response: {
          200: {
            description: "Gallery data",
            type: "object",
            properties: {
              success: { type: "boolean" },
              data: {
                oneOf: [
                  {
                    type: "object",
                    properties: {
                      category: { type: "string" },
                      title: { type: "string" },
                      total: { type: "integer" },
                      images: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            filename: { type: "string" },
                            url: { type: "string" },
                            alt: { type: "string" },
                          },
                        },
                      },
                    },
                  },
                  {
                    type: "array",
                  },
                ],
              },
            },
          },
          404: {
            description: "Category not found",
          },
        },
      },
    },
    handleGetGallery
  );
}
