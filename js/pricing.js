const priceData = {
  rafting: {
    "2026-04-26": "INR 1000 - INR 1400",
    "2026-04-27": "INR 1200 - INR 1500",
    "2026-04-28": "INR 900 - INR 1300",
  },
  bungee: {
    "2026-04-26": "INR 3000 - INR 3500",
    "2026-04-27": "INR 3200 - INR 3700",
    "2026-04-28": "INR 2800 - INR 3400",
  },
};

let currentYear = 0;
let currentMonth = 0;
let selectedDate = "";

function formatDateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatDisplayDate(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function updateCalendarMonthLabel(year, month) {
  const monthEl = document.getElementById("calendarMonth");
  if (!monthEl) {
    return;
  }

  monthEl.textContent = new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month, 1));
}

function updateDaySelectionStyles(activeDate) {
  const dayButtons = document.querySelectorAll("#calendar .day-box");
  dayButtons.forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.date === activeDate);
  });
}

function showPrice(dateKey) {
  const sportSelect = document.getElementById("sportSelect");
  const selectedDateEl = document.getElementById("selectedDate");
  const priceRangeEl = document.getElementById("priceRange");

  if (!sportSelect || !selectedDateEl || !priceRangeEl) {
    return;
  }

  selectedDate = dateKey;
  const sport = sportSelect.value;
  const price = priceData[sport]?.[dateKey] || "No data available for this date.";

  selectedDateEl.textContent = formatDisplayDate(dateKey);
  priceRangeEl.textContent = price;
  updateDaySelectionStyles(dateKey);
}

function generateCalendar(year, month) {
  const calendar = document.getElementById("calendar");
  const sportSelect = document.getElementById("sportSelect");

  if (!calendar || !sportSelect) {
    return;
  }

  calendar.innerHTML = "";
  updateCalendarMonthLabel(year, month);

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const activeSport = sportSelect.value;

  for (let index = 0; index < firstDayIndex; index += 1) {
    const spacer = document.createElement("div");
    spacer.className = "day-box day-box--empty";
    spacer.setAttribute("aria-hidden", "true");
    calendar.appendChild(spacer);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = formatDateKey(year, month, day);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "day-box";
    button.textContent = String(day);
    button.dataset.date = dateKey;

    if (priceData[activeSport]?.[dateKey]) {
      button.classList.add("day-box--has-price");
      button.setAttribute("aria-label", `${dateKey}: pricing available`);
    } else {
      button.setAttribute("aria-label", `${dateKey}: no pricing data`);
    }

    button.addEventListener("click", () => showPrice(dateKey));
    calendar.appendChild(button);
  }

  if (selectedDate) {
    updateDaySelectionStyles(selectedDate);
  }
}

function getPreferredCalendarMonth() {
  const sportSelect = document.getElementById("sportSelect");
  const sport = sportSelect?.value || "rafting";
  const firstDate = Object.keys(priceData[sport] || {}).sort()[0];

  if (!firstDate) {
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() };
  }

  const [year, month] = firstDate.split("-").map(Number);
  return { year, month: month - 1 };
}

function initDynamicPricingCalendar() {
  const sportSelect = document.getElementById("sportSelect");
  const calendar = document.getElementById("calendar");

  if (!sportSelect || !calendar) {
    return;
  }

  const preferred = getPreferredCalendarMonth();
  currentYear = preferred.year;
  currentMonth = preferred.month;

  sportSelect.addEventListener("change", () => {
    generateCalendar(currentYear, currentMonth);

    if (selectedDate) {
      showPrice(selectedDate);
      return;
    }

    const firstAvailableDate = Object.keys(priceData[sportSelect.value] || {}).sort()[0];
    if (firstAvailableDate) {
      showPrice(firstAvailableDate);
    }
  });

  generateCalendar(currentYear, currentMonth);

  const firstAvailableDate = Object.keys(priceData[sportSelect.value] || {}).sort()[0];
  if (firstAvailableDate) {
    showPrice(firstAvailableDate);
  }
}

document.addEventListener("DOMContentLoaded", initDynamicPricingCalendar);
