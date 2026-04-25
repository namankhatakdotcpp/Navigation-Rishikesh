import { initNavbar } from "./navbar.js";

function initNavbarShrink() {
  const header = document.querySelector(".site-header");
  if (!header) {
    return;
  }

  const threshold = 20;
  let isTicking = false;

  const updateHeaderState = () => {
    header.classList.toggle("is-condensed", window.scrollY > threshold);
    isTicking = false;
  };

  updateHeaderState();

  window.addEventListener(
    "scroll",
    () => {
      if (isTicking) {
        return;
      }

      isTicking = true;
      window.requestAnimationFrame(updateHeaderState);
    },
    { passive: true }
  );
}

function initThemeToggle() {
  const toggle = document.getElementById("theme-toggle");
  if (!toggle) {
    return;
  }

  toggle.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const nextTheme = currentTheme === "dark" ? "light" : "dark";

    if (nextTheme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("rtg-theme", "dark");
      return;
    }

    document.documentElement.removeAttribute("data-theme");
    localStorage.setItem("rtg-theme", "light");
  });
}

function initScrollReveal() {
  const revealElements = document.querySelectorAll("[data-reveal]");
  if (!revealElements.length) {
    return;
  }

  const observer = new IntersectionObserver(
    (entries, scrollObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          scrollObserver.unobserve(entry.target);
        }
      });
    },
    {
      rootMargin: "0px 0px -12% 0px",
      threshold: 0.15,
    }
  );

  revealElements.forEach((element) => observer.observe(element));
}

function initSmoothAnchorOffset() {
  const links = document.querySelectorAll('a[href^="#"], a[href*="/#"], a[href*="/experience#"]');
  if (!links.length) {
    return;
  }

  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");
      if (!href || !href.includes("#")) {
        return;
      }

      const [pathname, hash] = href.split("#");
      if (!hash) {
        return;
      }

      const targetPath = pathname || window.location.pathname;
      const currentPath = window.location.pathname;

      if (targetPath !== currentPath && targetPath !== "") {
        return;
      }

      const targetElement = document.getElementById(hash);
      if (!targetElement) {
        return;
      }

      event.preventDefault();
      const headerHeight = document.querySelector(".site-header")?.offsetHeight || 0;
      const targetY = targetElement.getBoundingClientRect().top + window.scrollY - headerHeight - 18;

      window.scrollTo({
        top: targetY,
        behavior: "smooth",
      });

      history.replaceState(null, "", `#${hash}`);
    });
  });
}

function initImageFallbackLazyLoad() {
  if ("loading" in HTMLImageElement.prototype) {
    return;
  }

  const images = document.querySelectorAll("img[loading='lazy']");
  if (!images.length) {
    return;
  }

  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const image = entry.target;
        image.src = image.src;
        observer.unobserve(image);
      }
    });
  });

  images.forEach((image) => imageObserver.observe(image));
}

document.addEventListener("DOMContentLoaded", () => {
  initNavbar();
  initNavbarShrink();
  initThemeToggle();
  initScrollReveal();
  initSmoothAnchorOffset();
  initImageFallbackLazyLoad();
});
