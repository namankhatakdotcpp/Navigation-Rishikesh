import { activityCatalog } from "./travelData.js";

const weatherCycle = ["sunny", "clear", "cloudy", "sunny", "windy", "rainy", "sunny"];

const weatherProfiles = {
  sunny: {
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
    label: "Clear",
    travelAdvice: "Stable weather with strong visibility and manageable river conditions.",
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
    label: "Cloudy",
    travelAdvice: "Comfortable for sightseeing, but confirm river activity intensity.",
    demandModifier: 0,
    priceModifier: 0,
    safety: {
      rafting: { status: "good", label: "Proceed with river-level check" },
      bungee: { status: "good", label: "Usually fine for jumping" },
      camping: { status: "good", label: "Comfortable campsite evening" },
      yoga: { status: "good", label: "Good for indoor/outdoor yoga" },
      combo: { status: "caution", label: "Check operator schedule before combo booking" },
    },
  },
  windy: {
    label: "Windy",
    travelAdvice: "Useful for calm sightseeing days, but high-altitude adventure needs caution.",
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
    label: "Rainy",
    travelAdvice: "Use this as a low-risk wellness and cafe day rather than a heavy adventure day.",
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

function getMonthTemperatureRange(monthIndex) {
  if ([0, 1, 11].includes(monthIndex)) {
    return [15, 24];
  }

  if ([2, 3, 4].includes(monthIndex)) {
    return [21, 31];
  }

  if ([5, 6, 7].includes(monthIndex)) {
    return [24, 34];
  }

  return [19, 29];
}

export function getWeatherForDate(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  const monthIndex = date.getMonth();
  const day = date.getDate();
  const [low, high] = getMonthTemperatureRange(monthIndex);
  const defaultCondition = weatherCycle[(day + monthIndex) % weatherCycle.length];

  let condition = defaultCondition;
  if ([6, 7].includes(monthIndex) && day % 3 !== 0) {
    condition = "rainy";
  } else if ([3, 4, 9].includes(monthIndex) && day % 5 === 0) {
    condition = "sunny";
  } else if ([10, 11, 0].includes(monthIndex) && day % 4 === 0) {
    condition = "clear";
  }

  const profile = weatherProfiles[condition];
  const temperature = Math.round(low + ((high - low) * ((day % 7) + 1)) / 8);
  const wind = 8 + ((day * 3) % 18);

  return {
    condition,
    label: profile.label,
    demandModifier: profile.demandModifier,
    priceModifier: profile.priceModifier,
    temperature,
    wind,
    advice: profile.travelAdvice,
    safetyMap: profile.safety,
  };
}

export function getActivityWeatherStatus(activityId, dateKey) {
  const weather = getWeatherForDate(dateKey);
  const fallback = { status: "good", label: "Weather looks manageable" };
  return weather.safetyMap[activityId] || fallback;
}

export function getBestActivitiesForDate(dateKey) {
  return Object.values(activityCatalog)
    .map((activity) => {
      const weatherStatus = getActivityWeatherStatus(activity.id, dateKey);
      const rankMap = { best: 3, good: 2, caution: 1, avoid: 0 };
      return {
        id: activity.id,
        name: activity.name,
        label: weatherStatus.label,
        status: weatherStatus.status,
        rank: rankMap[weatherStatus.status] ?? 1,
      };
    })
    .sort((left, right) => right.rank - left.rank);
}
