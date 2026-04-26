import { activityCatalog, vendorSignals } from "./travelData.js";
import { getActivityWeatherStatus, getWeatherForDate } from "./weatherEngine.js";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function getSeasonScore(activity, monthIndex) {
  return activity.seasonalPeakMonths.includes(monthIndex + 1) ? 12 : -4;
}

function getFestivalScore(monthIndex, day) {
  if ((monthIndex === 2 || monthIndex === 9 || monthIndex === 10) && [5, 12, 19, 26].includes(day)) {
    return 8;
  }

  if (monthIndex === 4 && [1, 2, 3, 30].includes(day)) {
    return 10;
  }

  return 0;
}

function getDemandLabel(score) {
  if (score >= 78) {
    return { label: "High demand", tone: "high", color: "high" };
  }

  if (score >= 56) {
    return { label: "Medium demand", tone: "medium", color: "medium" };
  }

  return { label: "Low demand", tone: "low", color: "low" };
}

function getDemandNarrative(score) {
  if (score >= 78) {
    return "High demand warning: book early to avoid sold-out prime slots.";
  }

  if (score >= 56) {
    return "Stable demand window with moderate price movement.";
  }

  return "Cheaper window: vendors may release discounts to fill capacity.";
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getDeterministicNoise(dateKey) {
  return dateKey.split("").reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 3), 0) % 10;
}

export function hasData(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  const year = date.getFullYear();
  const month = date.getMonth();

  if (year !== 2026) {
    return false;
  }

  if (month === 2) {
    return true;
  }

  if (month === 3 && date.getDate() <= 2) {
    return true;
  }

  return false;
}

export function mlDemandModel(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  const day = date.getDay();
  const dayOfMonth = date.getDate();
  let score = 40;

  if (day === 0 || day === 6) {
    score += 25;
  }

  if (dayOfMonth >= 10 && dayOfMonth <= 20) {
    score += 20;
  }

  if (dayOfMonth % 7 === 0) {
    score += 15;
  }

  score += getDeterministicNoise(dateKey);
  return Math.min(score, 100);
}

export function formatDateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function formatDisplayDate(dateKey) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateKey}T00:00:00`));
}

export function getCalendarMonthLabel(year, month) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month, 1));
}

export function getDemandLevel(score) {
  if (score >= 80) {
    return { label: "HIGH", color: "high", tone: "high" };
  }

  if (score >= 55) {
    return { label: "MEDIUM", color: "medium", tone: "medium" };
  }

  return { label: "LOW", color: "low", tone: "low" };
}

export function getDefaultAvailableDateKey() {
  return "2026-03-01";
}

export function getLastAvailableDateKey() {
  return "2026-04-02";
}

export function getNearestAvailableDateKey(dateKey) {
  if (hasData(dateKey)) {
    return dateKey;
  }

  const requestedDate = new Date(`${dateKey}T00:00:00`);
  const firstDate = new Date(`${getDefaultAvailableDateKey()}T00:00:00`);
  const lastDate = new Date(`${getLastAvailableDateKey()}T00:00:00`);

  if (requestedDate < firstDate) {
    return getDefaultAvailableDateKey();
  }

  return getLastAvailableDateKey();
}

export function getDayInsight(activityId, dateKey) {
  if (!hasData(dateKey)) {
    return null;
  }

  const activity = activityCatalog[activityId];
  const date = new Date(`${dateKey}T00:00:00`);
  const monthIndex = date.getMonth();
  const day = date.getDate();
  const weekend = isWeekend(date);
  const weather = getWeatherForDate(dateKey);

  const mlScore = mlDemandModel(dateKey);
  const seasonScore = getSeasonScore(activity, monthIndex);
  const weekendScore = weekend ? activity.weekendBoost : 0;
  const festivalScore = getFestivalScore(monthIndex, day);
  const microVariation = getDeterministicNoise(dateKey) - 4;
  const demandScore = clamp(
    Math.round((activity.baseDemand + mlScore + seasonScore + weekendScore + festivalScore + weather.demandModifier + microVariation) / 2),
    24,
    100
  );

  const loadRatio = clamp(demandScore / 100, 0.2, 0.96);
  const baseSlots = weekend ? activity.totalSlotsWeekend : activity.totalSlotsWeekday;
  const filledSlots = Math.round(baseSlots * loadRatio);
  const availableSlots = Math.max(baseSlots - filledSlots, 0);

  const fairPrice = Math.round(activity.basePrice + (demandScore > 80 ? 500 : demandScore > 60 ? 250 : -100) + weekendScore * 8 + festivalScore * 10 + weather.priceModifier * activity.basePrice);

  const minPrice = Math.round(fairPrice * 0.92);
  const maxPrice = Math.round(fairPrice * 1.09);
  const demandBand = getDemandLevel(demandScore);
  const weatherStatus = getActivityWeatherStatus(activityId, dateKey);
  const vendorSignal = vendorSignals[demandBand.tone];
  const isFestivalDay = festivalScore > 0;
  const pricingTag = isFestivalDay
    ? "Festival surge"
    : weekend
      ? "Weekend pricing"
      : weather.priceModifier < 0
        ? "Weather-adjusted discount"
        : weather.priceModifier > 0
          ? "Weather-driven premium"
          : "Regular pricing";

  return {
    activity,
    dateKey,
    hasData: true,
    weekend,
    isFestivalDay,
    mlScore,
    demandScore,
    demandBand,
    demandNarrative: getDemandNarrative(demandScore),
    weather,
    weatherStatus,
    fairPrice,
    priceRangeLabel: `${formatCurrency(minPrice)} - ${formatCurrency(maxPrice)}`,
    totalSlots: baseSlots,
    availableSlots,
    bookedPercent: Math.round((filledSlots / baseSlots) * 100),
    suggestedVendorPrice: formatCurrency(Math.round(fairPrice * 1.04)),
    vendorSignal,
    trustScore: activity.trustScore,
    verifiedVendors: Math.max(3, Math.round(activity.vendorCount * 0.72)),
    pricingTag,
  };
}

export function getMonthInsights(activityId, year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const dateKey = formatDateKey(year, month, day);
    return hasData(dateKey) ? getDayInsight(activityId, dateKey) : { dateKey, hasData: false };
  });
}

export function getSlotSchedule(activityId, dateKey) {
  const insight = getDayInsight(activityId, dateKey);
  if (!insight) {
    return [];
  }
  const slotTemplates = {
    rafting: [
      { time: "8:00 AM", tag: "Popular morning batch", status: "popular" },
      { time: "10:30 AM", tag: "Standard slot", status: "standard" },
      { time: "1:00 PM", tag: "Less crowded", status: "light" },
      { time: "3:30 PM", tag: "High demand evening slot", status: "popular" },
    ],
    bungee: [
      { time: "9:00 AM", tag: "Prime opening slot", status: "popular" },
      { time: "11:00 AM", tag: "Standard jump window", status: "standard" },
      { time: "1:30 PM", tag: "Balanced demand timing", status: "standard" },
      { time: "4:00 PM", tag: "Popular sunset-facing slot", status: "popular" },
    ],
    camping: [
      { time: "Check-in 1:00 PM", tag: "Best for riverside setup", status: "popular" },
      { time: "Check-in 3:00 PM", tag: "Standard arrival slot", status: "standard" },
      { time: "Check-in 5:00 PM", tag: "Quieter evening arrival", status: "light" },
    ],
    yoga: [
      { time: "6:00 AM", tag: "Most popular sunrise session", status: "popular" },
      { time: "7:30 AM", tag: "Standard guided class", status: "standard" },
      { time: "5:00 PM", tag: "Calmer evening practice", status: "light" },
    ],
    combo: [
      { time: "8:30 AM", tag: "Best full-day start", status: "popular" },
      { time: "10:00 AM", tag: "Standard combo slot", status: "standard" },
      { time: "12:00 PM", tag: "Less crowded late start", status: "light" },
    ],
  };

  return slotTemplates[activityId] || [
    { time: "9:00 AM", tag: "Popular timing", status: "popular" },
    { time: "12:00 PM", tag: "Standard slot", status: "standard" },
    { time: "3:00 PM", tag: "Less crowded", status: "light" },
  ];
}

export function getRollingWindowInsights(activityId, startDateKey, totalDays = 90) {
  const startDate = new Date(`${startDateKey}T00:00:00`);

  return Array.from({ length: totalDays }, (_, index) => {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + index);
    const dateKey = formatDateKey(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    return hasData(dateKey) ? getDayInsight(activityId, dateKey) : null;
  }).filter(Boolean);
}

export function getTrendData(activityId, startDateKey, totalDays = 30) {
  const insights = getRollingWindowInsights(activityId, startDateKey, totalDays);
  if (!insights.length) {
    return { labels: [], values: [], insights: [] };
  }

  return {
    labels: insights.map((insight) =>
      new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
      }).format(new Date(`${insight.dateKey}T00:00:00`))
    ),
    values: insights.map((insight) => insight.fairPrice),
    insights,
  };
}

export function getRecommendationSummary(activityId, startDateKey, totalDays = 90) {
  const insights = getRollingWindowInsights(activityId, startDateKey, totalDays);
  if (!insights.length) {
    return null;
  }
  const sortedByPrice = [...insights].sort((left, right) => left.fairPrice - right.fairPrice);
  const sortedByDemand = [...insights].sort((left, right) => right.demandScore - left.demandScore);
  const safeCandidates = insights
    .filter((insight) => ["best", "good"].includes(insight.weatherStatus.status))
    .sort((left, right) => left.fairPrice - right.fairPrice);

  const cheapest = sortedByPrice[0];
  const peak = sortedByDemand[0];
  const best = safeCandidates[0] || cheapest;

  return {
    cheapest,
    peak,
    best,
    windowLabel: `${formatDisplayDate(insights[0].dateKey)} - ${formatDisplayDate(insights[insights.length - 1].dateKey)}`,
  };
}
