export type WeatherCondition = "sunny" | "clear" | "cloudy" | "windy" | "rainy";

export interface NormalizedWeather {
  source: "live" | "mock";
  location: string;
  condition: WeatherCondition;
  label: string;
  temperature: number;
  feelsLike: number;
  windSpeed: number;
  humidity: number;
  iconUrl?: string;
  observedAt: string;
}

export interface WeatherProfile {
  condition: WeatherCondition;
  label: string;
  travelAdvice: string;
  demandModifier: number;
  priceModifier: number;
  safety: Record<string, ActivitySafety>;
}

export interface ActivitySafety {
  status: "best" | "good" | "caution" | "avoid";
  label: string;
}

export interface WeatherApiResponse {
  success: true;
  data: NormalizedWeather & {
    travelAdvice: string;
    demandModifier: number;
    priceModifier: number;
    activitySafety: Record<string, ActivitySafety>;
    cachedAt?: string;
  };
}
