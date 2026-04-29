import { getOrSet } from "../../infra/redis/client";
import { fetchLiveWeather } from "../../infra/external/weatherstack";
import { config } from "../../core/config";
import { logger } from "../../core/utils/logger";
import type {
  ActivitySafety,
  NormalizedWeather,
  WeatherApiResponse,
  WeatherCondition,
  WeatherProfile,
} from "./weather.types";

// ── Weather profile definitions (mirrors frontend weatherEngine.js) ───────────

const WEATHER_PROFILES: Record<WeatherCondition, WeatherProfile> = {
  sunny: {
    condition: "sunny",
    label: "Sunny",
    travelAdvice: "Best day for outdoor activities and riverside exploration.",
    demandModifier: 8,
    priceModifier: 0.06,
    safety: {
      rafting: { status: "best", label: "Best for rafting" },
      bungee: { status: "good", label: "Safe for bungee" },
      camping: { status: "good", label: "Comfortable camping weather" },
      yoga: { status: "best", label: "Excellent for sunrise yoga" },
      combo: { status: "good", label: "Strong adventure conditions" },
    },
  },
  clear: {
    condition: "clear",
    label: "Clear",
    travelAdvice:
      "Stable weather with strong visibility and manageable river conditions.",
    demandModifier: 4,
    priceModifier: 0.03,
    safety: {
      rafting: { status: "good", label: "Good rafting window" },
      bungee: { status: "good", label: "Safe for bungee" },
      camping: { status: "best", label: "Ideal overnight stay weather" },
      yoga: { status: "best", label: "Perfect for open-air yoga" },
      combo: { status: "good", label: "Good combo day" },
    },
  },
  cloudy: {
    condition: "cloudy",
    label: "Cloudy",
    travelAdvice:
      "Comfortable for sightseeing, but confirm river activity intensity.",
    demandModifier: 0,
    priceModifier: 0,
    safety: {
      rafting: { status: "good", label: "Proceed with river-level check" },
      bungee: { status: "good", label: "Usually fine for jumping" },
      camping: { status: "good", label: "Comfortable campsite evening" },
      yoga: { status: "good", label: "Good for indoor/outdoor yoga" },
      combo: {
        status: "caution",
        label: "Check operator schedule before combo booking",
      },
    },
  },
  windy: {
    condition: "windy",
    label: "Windy",
    travelAdvice:
      "Useful for calm sightseeing days, but high-altitude adventure needs caution.",
    demandModifier: -4,
    priceModifier: -0.04,
    safety: {
      rafting: { status: "caution", label: "Rafting possible with guide approval" },
      bungee: { status: "avoid", label: "Avoid bungee in strong wind" },
      camping: { status: "caution", label: "Secure camp setup recommended" },
      yoga: { status: "good", label: "Good for indoor yoga sessions" },
      combo: { status: "avoid", label: "Combo routes likely disrupted" },
    },
  },
  rainy: {
    condition: "rainy",
    label: "Rainy",
    travelAdvice:
      "Use this as a low-risk wellness and cafe day rather than a heavy adventure day.",
    demandModifier: -10,
    priceModifier: -0.08,
    safety: {
      rafting: { status: "avoid", label: "No rafting recommendation" },
      bungee: { status: "caution", label: "Expect delays and safety reviews" },
      camping: { status: "avoid", label: "Camping comfort drops sharply" },
      yoga: { status: "best", label: "Best day for yoga or wellness" },
      combo: { status: "avoid", label: "Adventure combo not recommended" },
    },
  },
};

// ── Mock fallback (deterministic by day-of-week so frontend behaves correctly) ─

const WEATHER_CYCLE: WeatherCondition[] = [
  "sunny",
  "clear",
  "cloudy",
  "sunny",
  "windy",
  "rainy",
  "sunny",
];

function buildMockWeather(): NormalizedWeather {
  const now = new Date();
  const cycleIndex = now.getDay();
  const condition = WEATHER_CYCLE[cycleIndex] ?? "clear";

  const monthTemps: Record<number, [number, number]> = {
    0: [15, 24], 1: [15, 24], 11: [15, 24],
    2: [21, 31], 3: [21, 31], 4: [21, 31],
    5: [24, 34], 6: [24, 34], 7: [24, 34],
    8: [19, 29], 9: [19, 29], 10: [19, 29],
  };
  const [low, high] = monthTemps[now.getMonth()] ?? [20, 28];
  const temperature = Math.round(low + ((high - low) * (now.getDate() % 7)) / 7);

  return {
    source: "mock",
    location: "Rishikesh",
    condition,
    label: WEATHER_PROFILES[condition].label,
    temperature,
    feelsLike: temperature - 2,
    windSpeed: 8 + ((now.getDate() * 3) % 18),
    humidity: 50 + (now.getDate() % 30),
    observedAt: now.toISOString(),
  };
}

// ── Public service ─────────────────────────────────────────────────────────────

export async function getWeather(city: string): Promise<WeatherApiResponse> {
  const cacheKey = `weather:${city.toLowerCase()}`;

  const weather = await getOrSet(
    cacheKey,
    config.WEATHER_CACHE_TTL_SECONDS,
    async (): Promise<NormalizedWeather> => {
      const live = await fetchLiveWeather();
      if (live) {
        logger.info({ city }, "Weather: live data fetched from Weatherstack");
        return live;
      }
      logger.warn({ city }, "Weather: using mock fallback");
      return buildMockWeather();
    }
  );

  const profile = WEATHER_PROFILES[weather.condition];

  return {
    success: true,
    data: {
      ...weather,
      travelAdvice: profile.travelAdvice,
      demandModifier: profile.demandModifier,
      priceModifier: profile.priceModifier,
      activitySafety: profile.safety as Record<string, ActivitySafety>,
      cachedAt: new Date().toISOString(),
    },
  };
}
