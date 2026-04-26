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

export function getDayInsight(activityId, dateKey) {
  const activity = activityCatalog[activityId];
  const date = new Date(`${dateKey}T00:00:00`);
  const monthIndex = date.getMonth();
  const day = date.getDate();
  const weekend = isWeekend(date);
  const weather = getWeatherForDate(dateKey);

  const seasonScore = getSeasonScore(activity, monthIndex);
  const weekendScore = weekend ? activity.weekendBoost : 0;
  const festivalScore = getFestivalScore(monthIndex, day);
  const microVariation = ((day * 7 + monthIndex * 11) % 9) - 4;
  const demandScore = clamp(
    activity.baseDemand + seasonScore + weekendScore + festivalScore + weather.demandModifier + microVariation,
    24,
    96
  );

  const loadRatio = clamp(demandScore / 100, 0.2, 0.96);
  const baseSlots = weekend ? activity.totalSlotsWeekend : activity.totalSlotsWeekday;
  const filledSlots = Math.round(baseSlots * loadRatio);
  const availableSlots = Math.max(baseSlots - filledSlots, 0);

  const fairPrice = Math.round(
    activity.basePrice *
      (1 + (demandScore - 50) / 180 + (weekend ? 0.05 : 0) + weather.priceModifier)
  );

  const minPrice = Math.round(fairPrice * 0.92);
  const maxPrice = Math.round(fairPrice * 1.09);
  const demandBand = getDemandLabel(demandScore);
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
    weekend,
    isFestivalDay,
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
    return getDayInsight(activityId, dateKey);
  });
}

export function getSlotSchedule(activityId, dateKey) {
  const insight = getDayInsight(activityId, dateKey);
  const activity = insight.activity;
  const slotTemplates = {
    rafting: ["8:00 AM", "10:30 AM", "1:00 PM", "3:30 PM"],
    bungee: ["9:00 AM", "11:00 AM", "1:30 PM", "4:00 PM"],
    camping: ["Check-in 1:00 PM", "Check-in 3:00 PM", "Check-in 5:00 PM"],
    yoga: ["6:00 AM", "7:30 AM", "5:00 PM"],
    combo: ["8:30 AM", "10:00 AM", "12:00 PM"],
  };

  const slots = slotTemplates[activityId] || ["9:00 AM", "12:00 PM", "3:00 PM"];
  const ratio = insight.availableSlots / insight.totalSlots;

  return slots.map((time, index) => {
    const threshold = ratio - index * 0.08;
    const status = threshold > 0.28 ? "open" : threshold > 0.1 ? "limited" : "sold-out";
    const labelMap = {
      open: "Available",
      limited: "Few slots left",
      "sold-out": "Sold out",
    };

    return {
      time,
      status,
      label: labelMap[status],
      seatsLeft: status === "open" ? Math.max(6, Math.round(insight.availableSlots / (index + 3))) : Math.max(0, 4 - index),
    };
  });
}

export function getRollingWindowInsights(activityId, startDateKey, totalDays = 90) {
  const startDate = new Date(`${startDateKey}T00:00:00`);

  return Array.from({ length: totalDays }, (_, index) => {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + index);
    const dateKey = formatDateKey(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    return getDayInsight(activityId, dateKey);
  });
}

export function getTrendData(activityId, startDateKey, totalDays = 30) {
  const insights = getRollingWindowInsights(activityId, startDateKey, totalDays);

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
