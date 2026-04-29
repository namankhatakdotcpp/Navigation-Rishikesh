export interface GalleryImage {
  filename: string;
  url: string;
  alt: string;
}

export interface GallerySection {
  category: string;
  slug: string;
  title: string;
  images: GalleryImage[];
  total: number;
}

export interface GalleryApiResponse {
  success: true;
  data: GallerySection | GallerySection[];
}
