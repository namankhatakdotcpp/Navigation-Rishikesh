import { z } from "zod";

export const weatherQuerySchema = z.object({
  city: z.string().min(1).max(100).optional().default("Rishikesh"),
});

export type WeatherQuery = z.infer<typeof weatherQuerySchema>;
