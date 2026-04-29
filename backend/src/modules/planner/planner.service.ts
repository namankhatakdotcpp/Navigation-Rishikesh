import { formatINR } from "../../core/utils/currency";
import type {
  BudgetTier,
  Experience,
  Interest,
  ItineraryDay,
  PlannerInput,
  StayOption,
  TripPlan,
} from "./planner.types";

// ── Static experience catalog ──────────────────────────────────────────────────

const EXPERIENCES: Experience[] = [
  {
    id: "arrival-aarti",
    title: "Arrival + Triveni Ghat Ganga Aarti",
    interests: ["spiritual", "family", "budget"],
    cost: 400,
    vendorType: "guided local transfer",
    time: "Evening",
  },
  {
    id: "rafting-run",
    title: "16 km river rafting run",
    interests: ["adventure", "nature"],
    cost: 1200,
    vendorType: "rafting operator",
    time: "Morning",
  },
  {
    id: "bungee-jump",
    title: "Bungee jump experience",
    interests: ["adventure"],
    cost: 3500,
    vendorType: "bungee operator",
    time: "Midday",
  },
  {
    id: "cafe-hop",
    title: "Laxman Jhula cafe trail",
    interests: ["nature", "family", "budget"],
    cost: 650,
    vendorType: "cafe network",
    time: "Afternoon",
  },
  {
    id: "beatles-ashram",
    title: "Beatles Ashram + forest walk",
    interests: ["culture", "nature", "budget"],
    cost: 900,
    vendorType: "guided walk",
    time: "Morning",
  },
  {
    id: "yoga-class",
    title: "Sunrise yoga and sound healing",
    interests: ["spiritual", "wellness"],
    cost: 850,
    vendorType: "yoga studio",
    time: "Sunrise",
  },
  {
    id: "camping-night",
    title: "Riverside camping stay",
    interests: ["nature", "family", "adventure"],
    cost: 2100,
    vendorType: "camp operator",
    time: "Night",
  },
  {
    id: "waterfall-trip",
    title: "Neer Garh waterfall outing",
    interests: ["nature", "family", "budget"],
    cost: 500,
    vendorType: "local transport",
    time: "Morning",
  },
  {
    id: "temple-trail",
    title: "Temple trail + Ram Jhula walk",
    interests: ["spiritual", "culture", "budget"],
    cost: 300,
    vendorType: "self-guided",
    time: "Morning",
  },
  {
    id: "ayurveda-session",
    title: "Ayurveda therapy session",
    interests: ["wellness", "spiritual"],
    cost: 1800,
    vendorType: "wellness center",
    time: "Afternoon",
  },
];

const STAY_OPTIONS: Record<BudgetTier, StayOption> = {
  low: { label: "Value stay", perNight: 1200 },
  mid: { label: "Comfort stay", perNight: 2200 },
  high: { label: "Boutique riverside stay", perNight: 4200 },
};

const DAY_BUDGET_CAPS: Record<BudgetTier, number> = {
  low: 1400,
  mid: 2600,
  high: 4800,
};

// ── Scoring algorithm ──────────────────────────────────────────────────────────

function pickExperiencesForDay(
  interests: Interest[],
  dayIndex: number,
  budgetTier: BudgetTier,
  usedIds: Set<string>
): Experience[] {
  const dayBudget = DAY_BUDGET_CAPS[budgetTier];

  const ranked = EXPERIENCES.filter((e) => !usedIds.has(e.id))
    .map((exp) => {
      const overlap = exp.interests.filter((i) =>
        (interests as string[]).includes(i)
      ).length;
      return {
        ...exp,
        score: overlap * 10 - Math.abs(exp.cost - dayBudget / 2) / 120,
      };
    })
    .sort((a, b) => b.score - a.score);

  if (!ranked.length) return [];

  const first = ranked[dayIndex % ranked.length]!;
  usedIds.add(first.id);

  const second = ranked.find(
    (e) => e.id !== first.id && e.cost + first.cost <= dayBudget + 1000
  );
  if (second) usedIds.add(second.id);

  return second ? [first, second] : [first];
}

// ── Public service ─────────────────────────────────────────────────────────────

export function buildTripPlan(input: PlannerInput): TripPlan {
  const { startDate, days, budgetTier, interests } = input;
  const safeInterests = interests.length
    ? interests
    : (["nature", "spiritual"] as Interest[]);

  const stay = STAY_OPTIONS[budgetTier];
  const usedIds = new Set<string>();
  const itinerary: ItineraryDay[] = [];

  for (let i = 0; i < days; i++) {
    const current = new Date(`${startDate}T00:00:00`);
    current.setDate(current.getDate() + i);

    const dayExperiences = pickExperiencesForDay(
      safeInterests,
      i,
      budgetTier,
      usedIds
    );

    const dayCost =
      dayExperiences.reduce((sum, e) => sum + e.cost, 0) + stay.perNight;

    const theme =
      i === 0
        ? "Arrival and orientation"
        : i === days - 1
        ? "Slow wrap-up and departure"
        : "High-fit local plan";

    itinerary.push({
      label: `Day ${i + 1}`,
      dateLabel: new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(current),
      theme,
      items: dayExperiences,
      dayCost,
    });
  }

  const totalCost = itinerary.reduce((sum, d) => sum + d.dayCost, 0);
  const buffer = Math.round(totalCost * 0.14);

  const summary: Record<BudgetTier, string> = {
    low: "Budget-focused plan with high-value activities and lighter spend.",
    mid: "Balanced itinerary mixing iconic experiences with comfortable stays.",
    high: "Premium itinerary with higher-adrenaline slots and better stay quality.",
  };

  return {
    stay,
    budgetTier,
    totalCost,
    range: `${formatINR(totalCost - buffer)} – ${formatINR(totalCost + buffer)}`,
    summary: summary[budgetTier],
    itinerary,
  };
}
