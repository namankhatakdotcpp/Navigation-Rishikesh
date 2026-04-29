import { promises as fs } from "fs";
import path from "path";
import { config } from "../../core/config";
import { NotFoundError } from "../../core/errors/HttpErrors";
import { logger } from "../../core/utils/logger";
import type { GallerySection } from "./gallery.types";

// Resolve the assets directory relative to the backend (goes up one level to the frontend root)
const ASSETS_ROOT = path.resolve(
  __dirname,
  "../../../../assets"
);

// Allowed image extensions
const IMAGE_EXTENSIONS = new Set([".jpeg", ".jpg", ".png", ".webp", ".avif"]);

// Category slug → display title mapping
const CATEGORY_TITLES: Record<string, string> = {
  "lakshman-jhula": "Lakshman Jhula",
  rafting: "River Rafting",
  "sunrise-point": "Sunrise Point",
  bungee: "Bungee Jumping",
  camping: "Riverside Camping",
  images: "Gallery",
  home: "Rishikesh",
};

function slugToTitle(slug: string): string {
  return (
    CATEGORY_TITLES[slug] ??
    slug
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
}

function buildImageUrl(category: string, filename: string): string {
  // Assets are served by the backend under /assets/:category/:filename
  // In production, point this to a CDN base URL via an env var
  const baseUrl = process.env["ASSETS_BASE_URL"] ?? `http://${config.HOST}:${config.PORT}`;
  return `${baseUrl}/assets/${encodeURIComponent(category)}/${encodeURIComponent(filename)}`;
}

async function readCategory(slug: string): Promise<GallerySection | null> {
  const dirPath = path.join(ASSETS_ROOT, slug);

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const images = entries
      .filter(
        (e) =>
          e.isFile() && IMAGE_EXTENSIONS.has(path.extname(e.name).toLowerCase())
      )
      .map((e) => ({
        filename: e.name,
        url: buildImageUrl(slug, e.name),
        alt: `${slugToTitle(slug)} — ${path.parse(e.name).name}`,
      }));

    return {
      category: slug,
      slug,
      title: slugToTitle(slug),
      images,
      total: images.length,
    };
  } catch (err) {
    logger.debug({ slug, err }, "Gallery: could not read category directory");
    return null;
  }
}

export async function getGallerySection(
  categorySlug: string
): Promise<GallerySection> {
  const section = await readCategory(categorySlug);
  if (!section) {
    throw new NotFoundError(`Gallery category '${categorySlug}'`);
  }
  return section;
}

export async function getAllGallerySections(): Promise<GallerySection[]> {
  let entries;
  try {
    entries = await fs.readdir(ASSETS_ROOT, { withFileTypes: true });
  } catch {
    logger.error({ ASSETS_ROOT }, "Gallery: assets root directory not readable");
    return [];
  }

  const dirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith("."));
  const sections = await Promise.all(dirs.map((d) => readCategory(d.name)));

  return sections.filter((s): s is GallerySection => s !== null && s.images.length > 0);
}
