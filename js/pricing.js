import { buildTripPlan } from "./plannerEngine.js";
import {
  formatDateKey,
  formatDisplayDate,
  getCalendarMonthLabel,
  getDefaultAvailableDateKey,
  getDayInsight,
  getLastAvailableDateKey,
  getMonthInsights,
  getNearestAvailableDateKey,
  getRecommendationSummary,
  hasData,
  getSlotSchedule,
  getTrendData,
} from "./pricingEngine.js";
import { activityCatalog } from "./travelData.js";
import { getBestActivitiesForDate } from "./weatherEngine.js";

const state = {
  activityId: "rafting",
  selectedDate: "",
  currentYear: 0,
  currentMonth: 0,
  chart: null,
  trendCache: {},
};

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function renderMarketCards() {
  const host = document.getElementById("marketSnapshot");
  if (!host) {
    return;
  }

  const cards = [
    {
      title: "Fair pricing",
      value: "Demand-aware",
      text: "Customers see a reasonable price range instead of random quotes.",
    },
    {
      title: "Availability clarity",
      value: "Live slot logic",
      text: "Operators can surface empty inventory before it becomes lost revenue.",
    },
    {
      title: "Trust filtering",
      value: "Verified vendors",
      text: "Safety and trust scores reduce the fake-operator problem.",
    },
    {
      title: "Planning support",
      value: "Rule-based planner",
      text: "Trips are shaped around budget, interest, season, and conditions.",
    },
  ];

  host.innerHTML = cards
    .map(
      (card) => `
        <article class="signal-card">
          <p class="signal-card__eyebrow">${card.title}</p>
          <h3>${card.value}</h3>
          <p>${card.text}</p>
        </article>
      `
    )
    .join("");
}

function renderPricingTable() {
  const body = document.getElementById("activityPricingRows");
  if (!body) {
    return;
  }

  body.innerHTML = Object.values(activityCatalog)
    .map(
      (activity) => `
        <tr>
          <td>${activity.name}</td>
          <td>${activity.duration}</td>
          <td>${activity.inclusions}</td>
          <td><strong>${new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
          }).format(activity.basePrice)}</strong></td>
        </tr>
      `
    )
    .join("");
}

function renderCalendar() {
  const calendar = document.getElementById("calendar");
  const monthLabel = document.getElementById("calendarMonth");
  if (!calendar || !monthLabel) {
    return;
  }

  const monthInsights = getMonthInsights(state.activityId, state.currentYear, state.currentMonth);
  const firstDayIndex = new Date(state.currentYear, state.currentMonth, 1).getDay();
  monthLabel.textContent = getCalendarMonthLabel(state.currentYear, state.currentMonth);

  calendar.innerHTML = "";
  Array.from({ length: firstDayIndex }).forEach(() => {
    const spacer = document.createElement("div");
    spacer.className = "day-box day-box--empty";
    spacer.setAttribute("aria-hidden", "true");
    calendar.appendChild(spacer);
  });

  monthInsights.forEach((insight) => {
    const button = document.createElement("button");
    button.type = "button";
    const date = new Date(`${insight.dateKey}T00:00:00`);

    if (insight.hasData === false) {
      button.className = "day-box day-box--nodata";
      button.disabled = true;
      button.setAttribute("aria-label", `${insight.dateKey}: no data`);
      button.innerHTML = `
        <span class="day-box__date">${date.getDate()}</span>
        <span class="day-box__meta">NO DATA</span>
      `;
    } else {
      button.className = `day-box day-box--${insight.demandBand.color}`;
      button.dataset.date = insight.dateKey;
      button.setAttribute("aria-label", `${insight.dateKey}: ${insight.demandBand.label}`);
      if (state.selectedDate === insight.dateKey) {
        button.classList.add("is-selected");
      }

      button.innerHTML = `
        <span class="day-box__date">${date.getDate()}</span>
        <span class="day-box__meta">${insight.demandBand.label}</span>
      `;

      button.addEventListener("click", () => {
        state.selectedDate = insight.dateKey;
        renderCalendar();
        renderSelectedInsight();
      });
    }

    calendar.appendChild(button);
  });
}

function renderSlots(activityId, dateKey) {
  const host = document.getElementById("slotList");
  if (!host) {
    return;
  }

  const slots = getSlotSchedule(activityId, dateKey);
  host.innerHTML = slots
    .map(
      (slot) => `
        <div class="slot-card slot-card--${slot.status}">
          <strong>${slot.time}</strong>
          <span>${slot.tag}</span>
          <small>Typical availability pattern</small>
        </div>
      `
    )
    .join("");
}

function renderBestActivities(dateKey) {
  const host = document.getElementById("weatherRecommendationList");
  if (!host) {
    return;
  }

  const recommendations = getBestActivitiesForDate(dateKey).slice(0, 4);
  host.innerHTML = recommendations
    .map(
      (item) => `
        <article class="recommendation-card recommendation-card--${item.status}">
          <h3>${item.name}</h3>
          <p>${item.label}</p>
        </article>
      `
    )
    .join("");
}

function destroyChartIfNeeded() {
  if (state.chart && typeof state.chart.destroy === "function") {
    state.chart.destroy();
    state.chart = null;
  }
}

function renderTrendChart() {
  const canvas = document.getElementById("priceChart");
  if (!canvas || typeof window.Chart === "undefined") {
    return;
  }

  // Get fresh data every time - no caching issues
  const trend = getTrendData(state.activityId, state.selectedDate);

  if (!trend || !trend.labels || trend.labels.length === 0) {
    setText("trendWindowLabel", "No chart data in this window");
    destroyChartIfNeeded();
    return;
  }

  // Format readable date range
  const firstInsight = trend.insights[0];
  const lastInsight = trend.insights[trend.insights.length - 1];
  const dateRangeLabel = `${formatDisplayDate(firstInsight.dateKey)} → ${formatDisplayDate(lastInsight.dateKey)}`;
  setText("trendWindowLabel", dateRangeLabel);
  
  destroyChartIfNeeded();

  try {
    state.chart = new window.Chart(canvas, {
      type: "line",
      data: {
        labels: trend.labels,
        datasets: [
          {
            label: "Fair price trend",
            data: trend.values,
            borderColor: "#1e6456",
            backgroundColor: "rgba(30, 100, 86, 0.14)",
            fill: true,
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 0,
            pointHoverRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: "none" },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
        },
        scales: {
          x: {
            type: "category",
            grid: { display: false },
            ticks: { 
              display: true,
              maxRotation: 45,
              minRotation: 0,
              autoSkip: true,
              maxTicksLimit: 8,
              font: { size: 11 },
            },
          },
          y: {
            beginAtZero: false,
            grid: { display: true, color: "rgba(0,0,0,0.05)" },
            ticks: { 
              display: true,
              font: { size: 10 },
              callback: function(value) {
                return "₹" + value.toLocaleString();
              }
            },
          },
        },
      },
    });
  } catch (error) {
    console.error("Chart rendering error:", error);
  }
}


function renderForecastInsights() {
  const summary = getRecommendationSummary(state.activityId, state.selectedDate, 20);
  if (!summary) {
    setText("bestDayLabel", "No data");
    setText("bestDayValue", "Prediction window unavailable");
    setText("cheapestDayLabel", "No data");
    setText("cheapestDayValue", "Prediction window unavailable");
    setText("peakDayLabel", "No data");
    setText("peakDayValue", "Prediction window unavailable");
    return;
  }

  setText("bestDayLabel", formatDisplayDate(summary.best.dateKey));
  setText("bestDayValue", `${summary.best.priceRangeLabel} • ${summary.best.weatherStatus.label}`);
  setText("cheapestDayLabel", formatDisplayDate(summary.cheapest.dateKey));
  setText("cheapestDayValue", `${summary.cheapest.priceRangeLabel} • ${summary.cheapest.pricingTag}`);
  setText("peakDayLabel", formatDisplayDate(summary.peak.dateKey));
  setText("peakDayValue", `${summary.peak.priceRangeLabel} • ${summary.peak.demandBand.label}`);
}

function renderSelectedInsight() {
  if (!hasData(state.selectedDate)) {
    setText("selectedDate", formatDisplayDate(state.selectedDate));
    setText("priceRange", "No data available");
    setText("priceTag", "Outside simulated dataset");
    setText("priceReason", "This ML-style simulation only includes full March 2026 data and April 1-2, 2026.");
    setText("demandScore", "--");
    setText("demandLabel", "No data");
    setText("weatherLabel", "--");
    setText("weatherAdvice", "No prediction available");
    setText("slotSummary", "No typical timing data");
    setText("vendorOccupancy", "--");
    setText("vendorPrice", "--");
    setText("vendorAction", "Select a supported date to view operator guidance.");
    setText("vendorRisk", "Simulation inactive");
    setText("trustScore", "--");
    setText("verifiedVendors", "No operator data");
    setText("selectedActivityName", activityCatalog[state.activityId].name);

    const demandBadge = document.getElementById("demandBadge");
    const weatherBadge = document.getElementById("weatherBadge");
    const slotList = document.getElementById("slotList");

    if (demandBadge) {
      demandBadge.className = "status-pill status-pill--nodata";
      demandBadge.textContent = "No data";
    }

    if (weatherBadge) {
      weatherBadge.className = "status-pill status-pill--nodata";
      weatherBadge.textContent = "No forecast";
    }

    if (slotList) {
      slotList.innerHTML = '<div class="slot-card slot-card--nodata"><strong>No timing pattern</strong><span>Typical slot guidance is unavailable for unsupported dates.</span></div>';
    }

    renderBestActivities(getNearestAvailableDateKey(state.selectedDate));
    renderTrendChart();
    renderForecastInsights();
    return;
  }

  const insightCacheKey = `${state.activityId}-${state.selectedDate}`;
  let insight = state.trendCache[insightCacheKey];
  
  if (!insight) {
    insight = getDayInsight(state.activityId, state.selectedDate);
    state.trendCache[insightCacheKey] = insight;
  }
  
  if (!insight || !insight.activity) {
    renderTrendChart();
    renderForecastInsights();
    return;
  }
  
  const activity = insight.activity;

  setText("selectedDate", formatDisplayDate(state.selectedDate));
  setText("priceRange", insight.priceRangeLabel);
  setText("priceTag", insight.pricingTag);
  setText("priceReason", `${insight.demandNarrative} ${insight.weather.advice}`);
  setText("demandScore", `${insight.demandScore}/100`);
  setText("demandLabel", insight.demandBand.label);
  setText("weatherLabel", `${insight.weather.label}, ${insight.weather.temperature}°C`);
  setText("weatherAdvice", insight.weatherStatus.label);
  setText("slotSummary", "Typical timing patterns");
  setText("vendorOccupancy", `${insight.bookedPercent}% booked`);
  setText("vendorPrice", insight.suggestedVendorPrice);
  setText("vendorAction", insight.vendorSignal.action);
  setText("vendorRisk", insight.vendorSignal.emptySlotRisk);
  setText("trustScore", `${insight.trustScore}/100`);
  setText("verifiedVendors", `${insight.verifiedVendors} verified operators`);
  setText("selectedActivityName", activity.name);

  const demandBadge = document.getElementById("demandBadge");
  const weatherBadge = document.getElementById("weatherBadge");

  if (demandBadge) {
    demandBadge.className = `status-pill status-pill--${insight.demandBand.tone}`;
    demandBadge.textContent = insight.demandBand.label;
  }

  if (weatherBadge) {
    weatherBadge.className = `status-pill status-pill--${insight.weatherStatus.status}`;
    weatherBadge.textContent = insight.weatherStatus.label;
  }

  renderSlots(state.activityId, state.selectedDate);
  renderBestActivities(state.selectedDate);
  renderTrendChart();
  renderForecastInsights();
}

function getTodayDateKey() {
  const today = new Date();
  return getNearestAvailableDateKey(formatDateKey(today.getFullYear(), today.getMonth(), today.getDate()));
}

function syncPlannerDate(dateKey) {
  const input = document.getElementById("plannerStartDate");
  if (input && !input.value) {
    input.value = dateKey;
  }
}

function initPlanner() {
  const form = document.getElementById("plannerForm");
  const output = document.getElementById("plannerOutput");
  if (!form || !output) {
    return;
  }

  const renderPlan = () => {
    const formData = new FormData(form);
    const startDate = String(formData.get("startDate") || state.selectedDate);
    const days = Number(formData.get("days") || 3);
    const budgetTier = String(formData.get("budget") || "mid");
    const interests = formData.getAll("interests").map(String);
    const plan = buildTripPlan({ startDate, days, budgetTier, interests });

    output.innerHTML = `
      <div class="planner-summary">
        <div>
          <p class="planner-summary__eyebrow">Estimated Budget</p>
          <h3>${plan.range}</h3>
          <p>${plan.summary}</p>
        </div>
        <div>
          <p class="planner-summary__eyebrow">Stay Assumption</p>
          <h3>${plan.stay.label}</h3>
          <p>${new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
          }).format(plan.stay.perNight)} per night</p>
        </div>
      </div>
      <div class="planner-days">
        ${plan.itinerary
          .map(
            (day) => `
              <article class="planner-day">
                <div class="planner-day__header">
                  <div>
                    <p>${day.label}</p>
                    <h4>${day.dateLabel}</h4>
                  </div>
                  <span>${day.theme}</span>
                </div>
                <div class="planner-day__items">
                  ${day.items
                    .map(
                      (item) => `
                        <div class="planner-item">
                          <strong>${item.time}</strong>
                          <h5>${item.title}</h5>
                          <p>${item.vendorType}</p>
                        </div>
                      `
                    )
                    .join("")}
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    `;
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    renderPlan();
  });

  renderPlan();
}

function initControls() {
  const activitySelect = document.getElementById("sportSelect");
  const prevButton = document.getElementById("monthPrev");
  const nextButton = document.getElementById("monthNext");

  if (activitySelect) {
    activitySelect.addEventListener("change", () => {
      state.activityId = activitySelect.value;
      renderCalendar();
      renderSelectedInsight();
    });
  }

  if (prevButton) {
    prevButton.addEventListener("click", () => {
      const nextDate = new Date(state.currentYear, state.currentMonth - 1, 1);
      state.currentYear = nextDate.getFullYear();
      state.currentMonth = nextDate.getMonth();
      state.selectedDate = formatDateKey(state.currentYear, state.currentMonth, 1);
      renderCalendar();
      renderSelectedInsight();
    });
  }

  if (nextButton) {
    nextButton.addEventListener("click", () => {
      const nextDate = new Date(state.currentYear, state.currentMonth + 1, 1);
      state.currentYear = nextDate.getFullYear();
      state.currentMonth = nextDate.getMonth();
      state.selectedDate = formatDateKey(state.currentYear, state.currentMonth, 1);
      renderCalendar();
      renderSelectedInsight();
    });
  }
}

function initPricingExperience() {
  renderPricingTable();
  renderMarketCards();

  const defaultDate = new Date(`${getDefaultAvailableDateKey()}T00:00:00`);
  state.currentYear = defaultDate.getFullYear();
  state.currentMonth = defaultDate.getMonth();
  state.selectedDate = getTodayDateKey();

  syncPlannerDate(state.selectedDate);
  initControls();
  renderCalendar();
  renderSelectedInsight();
  initPlanner();
}

document.addEventListener("DOMContentLoaded", initPricingExperience);
