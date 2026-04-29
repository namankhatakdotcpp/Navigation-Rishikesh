export type BudgetTier = "low" | "mid" | "high";
export type Interest =
  | "adventure"
  | "nature"
  | "spiritual"
  | "wellness"
  | "culture"
  | "family"
  | "budget";

export interface Experience {
  id: string;
  title: string;
  interests: Interest[];
  cost: number;
  vendorType: string;
  time: string;
}

export interface StayOption {
  label: string;
  perNight: number;
}

export interface ItineraryDay {
  label: string;
  dateLabel: string;
  theme: string;
  items: Experience[];
  dayCost: number;
}

export interface TripPlan {
  stay: StayOption;
  budgetTier: BudgetTier;
  totalCost: number;
  range: string;
  summary: string;
  itinerary: ItineraryDay[];
}

export interface PlannerInput {
  startDate: string;
  days: number;
  budgetTier: BudgetTier;
  interests: Interest[];
}

export interface PlannerApiResponse {
  success: true;
  data: TripPlan;
}
