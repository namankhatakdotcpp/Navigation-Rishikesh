export type ActivityId = "rafting" | "bungee" | "camping" | "yoga" | "combo";
export type DemandTone = "low" | "medium" | "high";
export type WeatherCondition = "sunny" | "clear" | "cloudy" | "windy" | "rainy";

export interface ActivityConfig {
  id: ActivityId;
  name: string;
  duration: string;
  inclusions: string;
  basePrice: number;
  baseDemand: number;
  weekendBoost: number;
  seasonalPeakMonths: number[];
  riskSensitivity: "low" | "medium" | "high";
  totalSlotsWeekday: number;
  totalSlotsWeekend: number;
  vendorCount: number;
  trustScore: number;
  interests: string[];
}

export interface WeatherProfile {
  condition: WeatherCondition;
  demandModifier: number;
  priceModifier: number;
  label: string;
  travelAdvice: string;
  safety: Record<string, { status: string; label: string }>;
}

export interface DemandBand {
  label: string;
  tone: DemandTone;
  color: DemandTone;
}

export interface SlotEntry {
  time: string;
  tag: string;
  status: "popular" | "standard" | "light";
}

export interface DayInsight {
  activity: ActivityConfig;
  dateKey: string;
  hasData: true;
  weekend: boolean;
  isFestivalDay: boolean;
  mlScore: number;
  demandScore: number;
  demandBand: DemandBand;
  demandNarrative: string;
  weather: {
    condition: WeatherCondition;
    label: string;
    temperature: number;
    windSpeed: number;
    travelAdvice: string;
    demandModifier: number;
    priceModifier: number;
  };
  weatherStatus: { status: string; label: string };
  fairPrice: number;
  priceRangeLabel: string;
  minPrice: number;
  maxPrice: number;
  totalSlots: number;
  availableSlots: number;
  bookedPercent: number;
  suggestedVendorPrice: string;
  vendorSignal: { emptySlotRisk: string; action: string };
  trustScore: number;
  verifiedVendors: number;
  pricingTag: string;
}

export interface PricingApiResponse {
  success: true;
  data: DayInsight;
}

export interface MonthInsightsApiResponse {
  success: true;
  data: Array<DayInsight | { dateKey: string; hasData: false }>;
}

export interface TrendApiResponse {
  success: true;
  data: {
    labels: string[];
    values: number[];
  };
}

export interface RecommendationApiResponse {
  success: true;
  data: {
    cheapest: DayInsight;
    peak: DayInsight;
    best: DayInsight;
    windowLabel: string;
  } | null;
}
