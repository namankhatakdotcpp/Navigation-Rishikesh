export function initNavbar() {
  const menu = document.getElementById("primary-menu");
  const toggle = document.getElementById("nav-toggle");
  const dropdownTrigger = document.querySelector(".nav-dropdown-trigger");
  const dropdownContainer = document.querySelector(".nav-item--dropdown");

  if (!menu || !toggle) {
    return;
  }

  const closeMenu = () => {
    menu.classList.remove("is-open");
    menu.dataset.open = "false";
    toggle.setAttribute("aria-expanded", "false");
  };

  const openMenu = () => {
    menu.classList.add("is-open");
    menu.dataset.open = "true";
    toggle.setAttribute("aria-expanded", "true");
  };

  toggle.addEventListener("click", () => {
    const isOpen = menu.dataset.open === "true";
    if (isOpen) {
      closeMenu();
      return;
    }
    openMenu();
  });

  if (dropdownTrigger && dropdownContainer) {
    dropdownTrigger.addEventListener("click", () => {
      const isOpen = dropdownContainer.classList.toggle("is-open");
      dropdownTrigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  }

  document.addEventListener("click", (event) => {
    const clickedInsideNav = event.target.closest(".nav-shell");
    if (!clickedInsideNav && window.innerWidth < 760) {
      closeMenu();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth >= 760) {
      menu.classList.remove("is-open");
      menu.dataset.open = "false";
      toggle.setAttribute("aria-expanded", "false");
    }
  });
}
