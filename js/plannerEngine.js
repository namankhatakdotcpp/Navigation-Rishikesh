import { plannerExperiences, stayBudgets } from "./travelData.js";

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function pickExperiences(interests, dayIndex, budgetTier) {
  const budgetCaps = { low: 1400, mid: 2600, high: 4800 };
  const dayBudget = budgetCaps[budgetTier] || budgetCaps.mid;

  const ranked = plannerExperiences
    .map((experience) => {
      const overlap = experience.interests.filter((interest) => interests.includes(interest)).length;
      return { ...experience, score: overlap * 10 - Math.abs(experience.cost - dayBudget / 2) / 120 };
    })
    .sort((left, right) => right.score - left.score);

  const first = ranked[dayIndex % ranked.length];
  const second = ranked.find((item) => item.id !== first.id && item.cost + first.cost <= dayBudget + 1000) || ranked[(dayIndex + 2) % ranked.length];
  return [first, second];
}

export function buildTripPlan({ startDate, days, budgetTier, interests }) {
  const safeInterests = interests.length ? interests : ["nature", "spiritual"];
  const stay = stayBudgets[budgetTier] || stayBudgets.mid;
  const itinerary = [];

  for (let index = 0; index < days; index += 1) {
    const currentDate = new Date(`${startDate}T00:00:00`);
    currentDate.setDate(currentDate.getDate() + index);
    const dayExperiences = pickExperiences(safeInterests, index, budgetTier);
    const dayCost = dayExperiences.reduce((sum, item) => sum + item.cost, 0) + stay.perNight;

    itinerary.push({
      label: `Day ${index + 1}`,
      dateLabel: new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
      }).format(currentDate),
      theme:
        index === 0
          ? "Arrival and orientation"
          : index === days - 1
            ? "Slow wrap-up and departure"
            : "High-fit local plan",
      items: dayExperiences,
      dayCost,
    });
  }

  const totalCost = itinerary.reduce((sum, item) => sum + item.dayCost, 0);
  const buffer = Math.round(totalCost * 0.14);

  return {
    stay,
    totalCost,
    range: `${formatCurrency(totalCost - buffer)} - ${formatCurrency(totalCost + buffer)}`,
    summary:
      budgetTier === "low"
        ? "Budget-focused plan with high-value activities and lighter spend."
        : budgetTier === "mid"
          ? "Balanced itinerary mixing iconic experiences with comfortable stays."
          : "Premium itinerary with higher-adrenaline slots and better stay quality.",
    itinerary,
  };
}
