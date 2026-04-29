import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log("Seeding database...");

  // ── Activities ──────────────────────────────────────────────────────────────

  await prisma.activity.createMany({
    data: [
      {
        id: "rafting",
        name: "River Rafting",
        duration: "2.5 - 3 hrs",
        inclusions: "Guide, helmet, paddle, transport",
        basePrice: 1200,
        baseDemand: 64,
        weekendBoost: 12,
        seasonalPeakMonths: [3, 4, 5, 9, 10, 11],
        riskSensitivity: "high",
        totalSlotsWeekday: 60,
        totalSlotsWeekend: 90,
        vendorCount: 18,
        trustScore: 91,
        interests: ["adventure", "nature"],
      },
      {
        id: "bungee",
        name: "Bungee Jumping",
        duration: "1 hr slot",
        inclusions: "Safety briefing, harness, certificate",
        basePrice: 3500,
        baseDemand: 58,
        weekendBoost: 10,
        seasonalPeakMonths: [3, 4, 5, 9, 10, 11, 12],
        riskSensitivity: "high",
        totalSlotsWeekday: 36,
        totalSlotsWeekend: 48,
        vendorCount: 6,
        trustScore: 95,
        interests: ["adventure"],
      },
      {
        id: "camping",
        name: "Riverside Camping",
        duration: "1 night",
        inclusions: "Tent stay, dinner, breakfast",
        basePrice: 2100,
        baseDemand: 52,
        weekendBoost: 16,
        seasonalPeakMonths: [2, 3, 4, 5, 9, 10, 11, 12],
        riskSensitivity: "medium",
        totalSlotsWeekday: 24,
        totalSlotsWeekend: 36,
        vendorCount: 14,
        trustScore: 87,
        interests: ["nature", "family", "spiritual"],
      },
      {
        id: "yoga",
        name: "Sunrise Yoga Session",
        duration: "90 mins",
        inclusions: "Instructor, yoga mat, herbal tea",
        basePrice: 850,
        baseDemand: 48,
        weekendBoost: 6,
        seasonalPeakMonths: [1, 2, 3, 10, 11, 12],
        riskSensitivity: "low",
        totalSlotsWeekday: 40,
        totalSlotsWeekend: 45,
        vendorCount: 22,
        trustScore: 94,
        interests: ["spiritual", "wellness"],
      },
      {
        id: "combo",
        name: "Adventure Combo",
        duration: "Full day",
        inclusions: "Rafting + zipline + lunch",
        basePrice: 4900,
        baseDemand: 44,
        weekendBoost: 14,
        seasonalPeakMonths: [3, 4, 5, 9, 10, 11],
        riskSensitivity: "high",
        totalSlotsWeekday: 18,
        totalSlotsWeekend: 28,
        vendorCount: 9,
        trustScore: 89,
        interests: ["adventure", "nature"],
      },
    ],
    skipDuplicates: true,
  });

  // ── Pricing Rules ───────────────────────────────────────────────────────────

  await prisma.pricingRule.createMany({
    data: [
      // Festival rules (March, October, November weekends)
      {
        ruleType: "festival",
        name: "Weekend Festival Surge",
        specificDays: [5, 12, 19, 26],
        startMonth: 3,
        endMonth: 3,
        scoreBonus: 8,
        priceOffset: 100,
        priority: 10,
      },
      {
        ruleType: "festival",
        name: "Navratri Festival",
        specificDays: [5, 12, 19, 26],
        startMonth: 10,
        endMonth: 11,
        scoreBonus: 8,
        priceOffset: 100,
        priority: 10,
      },
      // May holidays — bank holidays + long weekends
      {
        ruleType: "festival",
        name: "May Long Weekend",
        specificDays: [1, 2, 3, 30],
        startMonth: 5,
        endMonth: 5,
        scoreBonus: 10,
        priceOffset: 150,
        priority: 12,
      },
      // Seasonal peak
      {
        ruleType: "season",
        name: "Peak Season Boost",
        scoreBonus: 12,
        priceFactor: 0.05,
        priority: 5,
      },
      {
        ruleType: "season",
        name: "Off-Season Discount",
        scoreBonus: -4,
        priceFactor: -0.03,
        priority: 5,
      },
      // Weather modifiers
      {
        ruleType: "weather",
        name: "Sunny Day Premium",
        scoreBonus: 8,
        priceFactor: 0.06,
        priority: 3,
      },
      {
        ruleType: "weather",
        name: "Rainy Day Discount",
        scoreBonus: -10,
        priceFactor: -0.08,
        priority: 3,
      },
    ],
    skipDuplicates: true,
  });

  // ── Sample Vendors ──────────────────────────────────────────────────────────

  await prisma.vendor.createMany({
    data: [
      { name: "Ganga Rafting Co.", activityId: "rafting", rating: 4.7, priceOffset: 0, isVerified: true },
      { name: "Shiva Riverside Adventures", activityId: "rafting", rating: 4.5, priceOffset: -100, isVerified: true },
      { name: "Rishikesh Thrill Hub", activityId: "bungee", rating: 4.9, priceOffset: 0, isVerified: true },
      { name: "Himalayan Jump Co.", activityId: "bungee", rating: 4.6, priceOffset: 200, isVerified: true },
      { name: "Riverside Camp & Stay", activityId: "camping", rating: 4.4, priceOffset: 0, isVerified: false },
      { name: "Om Shanti Yoga Shala", activityId: "yoga", rating: 4.8, priceOffset: 0, isVerified: true },
      { name: "Adventure Nation Combo", activityId: "combo", rating: 4.5, priceOffset: 0, isVerified: true },
    ],
    skipDuplicates: true,
  });

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
