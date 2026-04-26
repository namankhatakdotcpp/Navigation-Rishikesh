import { galleryData } from "./galleryData.js";

function createPlaceholderSrc(title) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" role="img" aria-label="${title}">
      <defs>
        <linearGradient id="galleryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#d8c3a5" />
          <stop offset="100%" stop-color="#8db596" />
        </linearGradient>
      </defs>
      <rect width="1200" height="900" fill="url(#galleryGradient)" />
      <text x="50%" y="48%" text-anchor="middle" fill="#17342f" font-family="Manrope, Arial, sans-serif" font-size="54" font-weight="700">${title}</text>
      <text x="50%" y="56%" text-anchor="middle" fill="#17342f" font-family="Manrope, Arial, sans-serif" font-size="28">Add image file to ${title.toLowerCase()}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function openLightbox(source, label) {
  const lightbox = document.getElementById("lightbox");
  const lightboxImage = document.getElementById("lightboxImg");

  if (!lightbox || !lightboxImage) {
    return;
  }

  lightboxImage.src = source;
  lightboxImage.alt = label;
  lightbox.classList.remove("hidden");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.classList.add("lightbox-open");
}

function closeLightbox() {
  const lightbox = document.getElementById("lightbox");
  const lightboxImage = document.getElementById("lightboxImg");

  if (!lightbox || !lightboxImage) {
    return;
  }

  lightbox.classList.add("hidden");
  lightbox.setAttribute("aria-hidden", "true");
  lightboxImage.removeAttribute("src");
  lightboxImage.removeAttribute("alt");
  document.body.classList.remove("lightbox-open");
}

function buildGalleryItem(sectionTitle, sectionPath, imageName) {
  const figure = document.createElement("figure");
  figure.className = "gallery-item gallery-card";
  figure.setAttribute("data-reveal", "");
  figure.dataset.category = sectionTitle;

  const imageSource = `${sectionPath}${imageName}`;

  const image = document.createElement("img");
  image.src = imageSource;
  image.alt = sectionTitle;
  image.loading = "lazy";
  image.onerror = () => {
    image.onerror = null;
    image.src = createPlaceholderSrc(sectionTitle);
  };

  const caption = document.createElement("figcaption");
  caption.className = "label";
  caption.textContent = sectionTitle;

  figure.append(image, caption);
  figure.addEventListener("click", () => openLightbox(imageSource, sectionTitle));

  return figure;
}

function renderGallery(filter = "all") {
  const container = document.getElementById("galleryContainer");
  if (!container) {
    return;
  }

  const items = Object.entries(galleryData).flatMap(([sectionTitle, { path, images }]) => {
    if (filter !== "all" && filter !== sectionTitle) {
      return [];
    }

    return images.map((imageName) => buildGalleryItem(sectionTitle, path, imageName));
  });

  if (items.length) {
    container.replaceChildren(...items);
    return;
  }

  container.replaceChildren();
  const emptyState = document.createElement("p");
  emptyState.className = "gallery-empty";
  emptyState.textContent =
    filter === "all" ? "Gallery images will appear here soon." : `No images found for ${filter}.`;
  container.append(emptyState);
}

function initGalleryFilters() {
  const filterBar = document.querySelector("[data-gallery-filters]");
  if (!filterBar) {
    return;
  }

  filterBar.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) {
      return;
    }

    const filter = button.dataset.filter || "all";

    filterBar.querySelectorAll(".gallery-filter").forEach((item) => {
      const isActive = item === button;
      item.classList.toggle("is-active", isActive);
      item.setAttribute("aria-pressed", String(isActive));
    });

    renderGallery(filter);
  });
}

function initLightbox() {
  const lightbox = document.getElementById("lightbox");
  const closeButton = document.getElementById("lightboxClose");

  if (!lightbox || !closeButton) {
    return;
  }

  closeButton.addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) {
      closeLightbox();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !lightbox.classList.contains("hidden")) {
      closeLightbox();
    }
  });
}

export function initGallery() {
  const container = document.getElementById("galleryContainer");
  if (!container) {
    return;
  }

  if (!Object.keys(galleryData).length) {
    container.innerHTML = '<p class="gallery-empty">Gallery images will appear here soon.</p>';
    return;
  }

  initGalleryFilters();
  initLightbox();
  renderGallery();
}
