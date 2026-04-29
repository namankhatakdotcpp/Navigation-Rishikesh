import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { getAllGallerySections, getGallerySection } from "./gallery.service";

const galleryQuerySchema = z.object({
  category: z.string().min(1).max(80).optional(),
});

export async function handleGetGallery(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { category } = galleryQuerySchema.parse(request.query);

  if (category) {
    const data = await getGallerySection(category);
    reply.status(200).send({ success: true, data });
  } else {
    const data = await getAllGallerySections();
    reply.status(200).send({ success: true, data });
  }
}
