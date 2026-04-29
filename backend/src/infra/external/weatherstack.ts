import axios, { AxiosError } from "axios";
import { config } from "../../core/config";
import { logger } from "../../core/utils/logger";
import type { NormalizedWeather } from "../../modules/weather/weather.types";

interface WeatherstackResponse {
  current: {
    temperature: number;
    weather_descriptions: string[];
    wind_speed: number;
    humidity: number;
    feelslike: number;
    weather_icons: string[];
    observation_time: string;
  };
  location: {
    name: string;
    country: string;
    localtime: string;
  };
  error?: {
    code: number;
    info: string;
  };
}

export async function fetchLiveWeather(): Promise<NormalizedWeather | null> {
  try {
    const response = await axios.get<WeatherstackResponse>(
      config.WEATHERSTACK_API_BASE_URL,
      {
        params: {
          access_key: config.WEATHERSTACK_API_KEY,
          query: config.WEATHERSTACK_QUERY,
          units: "m",
        },
        timeout: 5_000,
      }
    );

    if (response.data.error) {
      logger.warn(
        { code: response.data.error.code, info: response.data.error.info },
        "Weatherstack API returned an error"
      );
      return null;
    }

    const { current, location } = response.data;
    return normalize(current, location);
  } catch (err) {
    if (err instanceof AxiosError && err.code === "ERR_NETWORK") {
      logger.warn(
        "Weatherstack API unreachable (mixed-content or network issue). Falling back to mock."
      );
    } else {
      logger.warn({ err }, "Weatherstack API call failed");
    }
    return null;
  }
}

function normalize(
  current: WeatherstackResponse["current"],
  location: WeatherstackResponse["location"]
): NormalizedWeather {
  const desc = current.weather_descriptions[0]?.toLowerCase() ?? "clear";
  const condition = mapCondition(desc);

  return {
    source: "live",
    location: location.name,
    condition,
    label: current.weather_descriptions[0] ?? "Clear",
    temperature: current.temperature,
    feelsLike: current.feelslike,
    windSpeed: current.wind_speed,
    humidity: current.humidity,
    iconUrl: current.weather_icons[0],
    observedAt: location.localtime,
  };
}

function mapCondition(desc: string): NormalizedWeather["condition"] {
  if (desc.includes("rain") || desc.includes("drizzle") || desc.includes("shower")) return "rainy";
  if (desc.includes("cloud") || desc.includes("overcast")) return "cloudy";
  if (desc.includes("wind") || desc.includes("breeze")) return "windy";
  if (desc.includes("sun") || desc.includes("clear")) return "sunny";
  return "clear";
}
