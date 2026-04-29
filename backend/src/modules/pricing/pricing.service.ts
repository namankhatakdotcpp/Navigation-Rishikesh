import { db } from "../../infra/db/client";
import { getOrSet } from "../../infra/redis/client";
import { clamp, formatINR } from "../../core/utils/currency";
import { NotFoundError } from "../../core/errors/HttpErrors";
import type {
  ActivityConfig,
  ActivityId,
  DayInsight,
  DemandBand,
  DemandTone,
  SlotEntry,
  WeatherCondition,
  WeatherProfile,
} from "./pricing.types";

// ── Static catalogs (sourced from DB seed; in-memory for O(1) lookups) ─────────

const ACTIVITY_CATALOG: Record<ActivityId, ActivityConfig> = {
  rafting: {
    id: "rafting", name: "River Rafting", duration: "2.5 - 3 hrs",
    inclusions: "Guide, helmet, paddle, transport",
    basePrice: 1200, baseDemand: 64, weekendBoost: 12,
    seasonalPeakMonths: [3, 4, 5, 9, 10, 11], riskSensitivity: "high",
    totalSlotsWeekday: 60, totalSlotsWeekend: 90,
    vendorCount: 18, trustScore: 91, interests: ["adventure", "nature"],
  },
  bungee: {
    id: "bungee", name: "Bungee Jumping", duration: "1 hr slot",
    inclusions: "Safety briefing, harness, certificate",
    basePrice: 3500, baseDemand: 58, weekendBoost: 10,
    seasonalPeakMonths: [3, 4, 5, 9, 10, 11, 12], riskSensitivity: "high",
    totalSlotsWeekday: 36, totalSlotsWeekend: 48,
    vendorCount: 6, trustScore: 95, interests: ["adventure"],
  },
  camping: {
    id: "camping", name: "Riverside Camping", duration: "1 night",
    inclusions: "Tent stay, dinner, breakfast",
    basePrice: 2100, baseDemand: 52, weekendBoost: 16,
    seasonalPeakMonths: [2, 3, 4, 5, 9, 10, 11, 12], riskSensitivity: "medium",
    totalSlotsWeekday: 24, totalSlotsWeekend: 36,
    vendorCount: 14, trustScore: 87, interests: ["nature", "family", "spiritual"],
  },
  yoga: {
    id: "yoga", name: "Sunrise Yoga Session", duration: "90 mins",
    inclusions: "Instructor, yoga mat, herbal tea",
    basePrice: 850, baseDemand: 48, weekendBoost: 6,
    seasonalPeakMonths: [1, 2, 3, 10, 11, 12], riskSensitivity: "low",
    totalSlotsWeekday: 40, totalSlotsWeekend: 45,
    vendorCount: 22, trustScore: 94, interests: ["spiritual", "wellness"],
  },
  combo: {
    id: "combo", name: "Adventure Combo", duration: "Full day",
    inclusions: "Rafting + zipline + lunch",
    basePrice: 4900, baseDemand: 44, weekendBoost: 14,
    seasonalPeakMonths: [3, 4, 5, 9, 10, 11], riskSensitivity: "high",
    totalSlotsWeekday: 18, totalSlotsWeekend: 28,
    vendorCount: 9, trustScore: 89, interests: ["adventure", "nature"],
  },
};

const VENDOR_SIGNALS: Record<DemandTone, { emptySlotRisk: string; action: string }> = {
  low: {
    emptySlotRisk: "High empty-slot risk",
    action: "Offer bundle discounts and push weekday inventory.",
  },
  medium: {
    emptySlotRisk: "Balanced demand",
    action: "Hold prices steady and promote verified packages.",
  },
  high: {
    emptySlotRisk: "Peak demand window",
    action: "Increase price cautiously and release backup slots.",
  },
};

const WEATHER_CYCLE: WeatherCondition[] = [
  "sunny", "clear", "cloudy", "sunny", "windy", "rainy", "sunny",
];

const WEATHER_PROFILES: Record<WeatherCondition, WeatherProfile> = {
  sunny: {
    condition: "sunny", label: "Sunny",
    travelAdvice: "Best day for outdoor activities and riverside exploration.",
    demandModifier: 8, priceModifier: 0.06,
    safety: {
      rafting: { status: "best", label: "Best for rafting" },
      bungee: { status: "good", label: "Safe for bungee" },
      camping: { status: "good", label: "Comfortable camping weather" },
      yoga: { status: "best", label: "Excellent for sunrise yoga" },
      combo: { status: "good", label: "Strong adventure conditions" },
    },
  },
  clear: {
    condition: "clear", label: "Clear",
    travelAdvice: "Stable weather with strong visibility and manageable river conditions.",
    demandModifier: 4, priceModifier: 0.03,
    safety: {
      rafting: { status: "good", label: "Good rafting window" },
      bungee: { status: "good", label: "Safe for bungee" },
      camping: { status: "best", label: "Ideal overnight stay weather" },
      yoga: { status: "best", label: "Perfect for open-air yoga" },
      combo: { status: "good", label: "Good combo day" },
    },
  },
  cloudy: {
    condition: "cloudy", label: "Cloudy",
    travelAdvice: "Comfortable for sightseeing, but confirm river activity intensity.",
    demandModifier: 0, priceModifier: 0,
    safety: {
      rafting: { status: "good", label: "Proceed with river-level check" },
      bungee: { status: "good", label: "Usually fine for jumping" },
      camping: { status: "good", label: "Comfortable campsite evening" },
      yoga: { status: "good", label: "Good for indoor/outdoor yoga" },
      combo: { status: "caution", label: "Check operator schedule before combo booking" },
    },
  },
  windy: {
    condition: "windy", label: "Windy",
    travelAdvice: "Useful for calm sightseeing days, but high-altitude adventure needs caution.",
    demandModifier: -4, priceModifier: -0.04,
    safety: {
      rafting: { status: "caution", label: "Rafting possible with guide approval" },
      bungee: { status: "avoid", label: "Avoid bungee in strong wind" },
      camping: { status: "caution", label: "Secure camp setup recommended" },
      yoga: { status: "good", label: "Good for indoor yoga sessions" },
      combo: { status: "avoid", label: "Combo routes likely disrupted" },
    },
  },
  rainy: {
    condition: "rainy", label: "Rainy",
    travelAdvice: "Use this as a low-risk wellness and cafe day rather than a heavy adventure day.",
    demandModifier: -10, priceModifier: -0.08,
    safety: {
      rafting: { status: "avoid", label: "No rafting recommendation" },
      bungee: { status: "caution", label: "Expect delays and safety reviews" },
      camping: { status: "avoid", label: "Camping comfort drops sharply" },
      yoga: { status: "best", label: "Best day for yoga or wellness" },
      combo: { status: "avoid", label: "Adventure combo not recommended" },
    },
  },
};

const SLOT_TEMPLATES: Record<ActivityId, SlotEntry[]> = {
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

// ── Pure pricing algorithm ─────────────────────────────────────────────────────

function isWeekend(date: Date): boolean {
  const d = date.getDay();
  return d === 0 || d === 6;
}

function getDeterministicNoise(dateKey: string): number {
  return (
    dateKey
      .split("")
      .reduce((sum, char, idx) => sum + char.charCodeAt(0) * (idx + 3), 0) % 10
  );
}

function mlDemandModel(dateKey: string): number {
  const date = new Date(`${dateKey}T00:00:00`);
  const day = date.getDay();
  const dayOfMonth = date.getDate();
  let score = 40;
  if (day === 0 || day === 6) score += 25;
  if (dayOfMonth >= 10 && dayOfMonth <= 20) score += 20;
  if (dayOfMonth % 7 === 0) score += 15;
  score += getDeterministicNoise(dateKey);
  return Math.min(score, 100);
}

function getSeasonScore(activity: ActivityConfig, monthIndex: number): number {
  return activity.seasonalPeakMonths.includes(monthIndex + 1) ? 12 : -4;
}

// Festival rules are now loaded from DB but default heuristics are applied here
// when DB rules are not available. DB rules override these defaults.
function getFestivalScore(monthIndex: number, day: number): number {
  if (
    [2, 9, 10].includes(monthIndex) &&
    [5, 12, 19, 26].includes(day)
  )
    return 8;
  if (monthIndex === 4 && [1, 2, 3, 30].includes(day)) return 10;
  return 0;
}

function getWeatherForDate(dateKey: string): WeatherProfile {
  const date = new Date(`${dateKey}T00:00:00`);
  const monthIndex = date.getMonth();
  const day = date.getDate();
  let condition: WeatherCondition =
    WEATHER_CYCLE[(day + monthIndex) % WEATHER_CYCLE.length] ?? "clear";

  if ([6, 7].includes(monthIndex) && day % 3 !== 0) condition = "rainy";
  else if ([3, 4, 9].includes(monthIndex) && day % 5 === 0) condition = "sunny";
  else if ([10, 11, 0].includes(monthIndex) && day % 4 === 0) condition = "clear";

  return WEATHER_PROFILES[condition];
}

function getMonthTemperature(monthIndex: number, day: number): number {
  const ranges: [number, number][] = [
    [15,24],[15,24],[21,31],[21,31],[21,31],[24,34],
    [24,34],[24,34],[19,29],[19,29],[19,29],[15,24],
  ];
  const [low, high] = ranges[monthIndex] ?? [20, 28];
  return Math.round(low + ((high - low) * ((day % 7) + 1)) / 8);
}

function getDemandLabel(score: number): DemandBand {
  if (score >= 78)
    return { label: "High demand", tone: "high", color: "high" };
  if (score >= 56)
    return { label: "Medium demand", tone: "medium", color: "medium" };
  return { label: "Low demand", tone: "low", color: "low" };
}

function getDemandNarrative(score: number): string {
  if (score >= 78) return "High demand warning: book early to avoid sold-out prime slots.";
  if (score >= 56) return "Stable demand window with moderate price movement.";
  return "Cheaper window: vendors may release discounts to fill capacity.";
}

// ── Core computation (no date-range restriction — works for any valid date) ────

function computeDayInsight(
  activityId: ActivityId,
  dateKey: string,
  dbFestivalBonus = 0
): DayInsight {
  const activity = ACTIVITY_CATALOG[activityId];
  const date = new Date(`${dateKey}T00:00:00`);
  const monthIndex = date.getMonth();
  const day = date.getDate();
  const weekend = isWeekend(date);
  const weatherProfile = getWeatherForDate(dateKey);

  const mlScore = mlDemandModel(dateKey);
  const seasonScore = getSeasonScore(activity, monthIndex);
  const weekendScore = weekend ? activity.weekendBoost : 0;
  const festivalScore = Math.max(getFestivalScore(monthIndex, day), dbFestivalBonus);
  const microVariation = getDeterministicNoise(dateKey) - 4;

  const rawDemand =
    activity.baseDemand +
    mlScore +
    seasonScore +
    weekendScore +
    festivalScore +
    weatherProfile.demandModifier +
    microVariation;

  const demandScore = clamp(Math.round(rawDemand / 2), 24, 100);
  const demandBand = getDemandLabel(demandScore);

  const loadRatio = clamp(demandScore / 100, 0.2, 0.96);
  const baseSlots = weekend ? activity.totalSlotsWeekend : activity.totalSlotsWeekday;
  const filledSlots = Math.round(baseSlots * loadRatio);
  const availableSlots = Math.max(baseSlots - filledSlots, 0);

  const fairPrice = Math.round(
    activity.basePrice +
      (demandScore > 80 ? 500 : demandScore > 60 ? 250 : -100) +
      weekendScore * 8 +
      festivalScore * 10 +
      weatherProfile.priceModifier * activity.basePrice
  );

  const minPrice = Math.round(fairPrice * 0.92);
  const maxPrice = Math.round(fairPrice * 1.09);
  const isFestivalDay = festivalScore > 0;

  const weatherStatus =
    weatherProfile.safety[activityId] ?? { status: "good", label: "Weather looks manageable" };

  const pricingTag = isFestivalDay
    ? "Festival surge"
    : weekend
    ? "Weekend pricing"
    : weatherProfile.priceModifier < 0
    ? "Weather-adjusted discount"
    : weatherProfile.priceModifier > 0
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
    weather: {
      condition: weatherProfile.condition,
      label: weatherProfile.label,
      temperature: getMonthTemperature(monthIndex, day),
      windSpeed: 8 + ((day * 3) % 18),
      travelAdvice: weatherProfile.travelAdvice,
      demandModifier: weatherProfile.demandModifier,
      priceModifier: weatherProfile.priceModifier,
    },
    weatherStatus,
    fairPrice,
    minPrice,
    maxPrice,
    priceRangeLabel: `${formatINR(minPrice)} – ${formatINR(maxPrice)}`,
    totalSlots: baseSlots,
    availableSlots,
    bookedPercent: Math.round((filledSlots / baseSlots) * 100),
    suggestedVendorPrice: formatINR(Math.round(fairPrice * 1.04)),
    vendorSignal: VENDOR_SIGNALS[demandBand.tone],
    trustScore: activity.trustScore,
    verifiedVendors: Math.max(3, Math.round(activity.vendorCount * 0.72)),
    pricingTag,
  };
}

// ── DB-augmented festival bonus ────────────────────────────────────────────────

async function fetchDbFestivalBonus(
  activityId: ActivityId,
  monthIndex: number,
  day: number
): Promise<number> {
  try {
    const rules = await db.pricingRule.findMany({
      where: {
        ruleType: "festival",
        isActive: true,
        OR: [{ activityId }, { activityId: null }],
      },
    });

    return rules.reduce((bonus, rule) => {
      const inMonth =
        rule.startMonth === null ||
        (monthIndex + 1 >= (rule.startMonth ?? 0) &&
          monthIndex + 1 <= (rule.endMonth ?? 12));
      const onDay =
        rule.specificDays.length === 0 || rule.specificDays.includes(day);

      return inMonth && onDay ? Math.max(bonus, rule.scoreBonus) : bonus;
    }, 0);
  } catch {
    return 0;
  }
}

// ── Public service API ─────────────────────────────────────────────────────────

export async function getDayPricing(
  activityId: ActivityId,
  dateKey: string
): Promise<DayInsight> {
  const activity = ACTIVITY_CATALOG[activityId];
  if (!activity) throw new NotFoundError(`Activity '${activityId}'`);

  const cacheKey = `pricing:${activityId}:${dateKey}`;

  return getOrSet(cacheKey, 300, async () => {
    const date = new Date(`${dateKey}T00:00:00`);
    const dbBonus = await fetchDbFestivalBonus(
      activityId,
      date.getMonth(),
      date.getDate()
    );
    return computeDayInsight(activityId, dateKey, dbBonus);
  });
}

export async function getMonthPricing(
  activityId: ActivityId,
  year: number,
  month: number
): Promise<Array<DayInsight | { dateKey: string; hasData: false }>> {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const results = await Promise.all(
    Array.from({ length: daysInMonth }, async (_, idx) => {
      const day = idx + 1;
      const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      return getDayPricing(activityId, dateKey);
    })
  );
  return results;
}

export function getSlotSchedule(activityId: ActivityId): SlotEntry[] {
  return SLOT_TEMPLATES[activityId] ?? [
    { time: "9:00 AM", tag: "Popular timing", status: "popular" },
    { time: "12:00 PM", tag: "Standard slot", status: "standard" },
    { time: "3:00 PM", tag: "Less crowded", status: "light" },
  ];
}

export async function getTrend(
  activityId: ActivityId,
  startDateKey: string,
  days: number
): Promise<{ labels: string[]; values: number[] }> {
  const startDate = new Date(`${startDateKey}T00:00:00`);
  const insights: DayInsight[] = [];

  for (let i = 0; i < days; i++) {
    const current = new Date(startDate);
    current.setDate(current.getDate() + i);
    const dateKey = current.toISOString().split("T")[0]!;
    const insight = await getDayPricing(activityId, dateKey);
    insights.push(insight);
  }

  return {
    labels: insights.map((ins) =>
      new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(
        new Date(`${ins.dateKey}T00:00:00`)
      )
    ),
    values: insights.map((ins) => ins.fairPrice),
  };
}

export async function getRecommendation(
  activityId: ActivityId,
  startDateKey: string,
  days: number
): Promise<{
  cheapest: DayInsight;
  peak: DayInsight;
  best: DayInsight;
  windowLabel: string;
} | null> {
  const startDate = new Date(`${startDateKey}T00:00:00`);
  const insights: DayInsight[] = [];

  for (let i = 0; i < days; i++) {
    const current = new Date(startDate);
    current.setDate(current.getDate() + i);
    const dateKey = current.toISOString().split("T")[0]!;
    insights.push(await getDayPricing(activityId, dateKey));
  }

  if (!insights.length) return null;

  const sortedByPrice = [...insights].sort((a, b) => a.fairPrice - b.fairPrice);
  const sortedByDemand = [...insights].sort((a, b) => b.demandScore - a.demandScore);
  const safeCandidates = insights
    .filter((i) => ["best", "good"].includes(i.weatherStatus.status))
    .sort((a, b) => a.fairPrice - b.fairPrice);

  const cheapest = sortedByPrice[0]!;
  const peak = sortedByDemand[0]!;
  const best = safeCandidates[0] ?? cheapest;

  const fmt = (dk: string) =>
    new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(`${dk}T00:00:00`));

  return {
    cheapest,
    peak,
    best,
    windowLabel: `${fmt(insights[0]!.dateKey)} – ${fmt(insights[insights.length - 1]!.dateKey)}`,
  };
}
