import axios from "axios";
import { config } from "../../core/config";
import { logger } from "../../core/utils/logger";
import { getOrSet } from "../../infra/redis/client";
import type { FlightReach, RoadReach, TrainReach } from "./reach.types";

// ── Static intelligence data (authoritative, updated manually) ─────────────────
// Source: official tourism data, Google Maps distance estimates, and
// Uttarakhand tourism board guides.

const ROAD_DATA: RoadReach = {
  mode: "road",
  origin: "New Delhi",
  destination: "Rishikesh",
  distanceKm: 250,
  etaLabel: "5 – 6 hrs",
  routes: [
    {
      name: "NH 58 — Haridwar Bypass (Recommended)",
      description: "Delhi → Meerut → Muzaffarnagar → Roorkee → Haridwar → Rishikesh via NH 58.",
      distanceKm: 250,
      etaLabel: "5 – 6 hrs",
      highlights: [
        "Delhi–Meerut Expressway cuts Delhi exit time by 45 min",
        "Most maintained NH through the Ganga plain",
        "Last fuel station at Haridwar before Rishikesh",
      ],
      recommended: true,
    },
    {
      name: "Dehradun Road — Scenic Hill Route",
      description:
        "Delhi → Dehradun via Haridwar, then down to Rishikesh (35 km extra). Mountain views from Rajaji corridor.",
      distanceKm: 285,
      etaLabel: "6 – 7 hrs",
      highlights: [
        "Rajaji National Park buffer zone",
        "Avoids Haridwar city traffic",
        "Better road quality on Dehradun–Rishikesh stretch",
      ],
      recommended: false,
    },
  ],
  tips: [
    "Start before 6 AM to avoid Delhi traffic; target Haridwar by 11 AM.",
    "Avoid the Haridwar city road during Kanwar Yatra (Jul–Aug) — use the bypass.",
    "Carry cash — toll gates on NH 58 do not always accept UPI.",
    "Rishikesh city traffic peaks 5 – 8 PM; park at the Laxman Jhula lot and walk.",
  ],
  googleMapsUrl:
    "https://maps.google.com/maps/dir/New+Delhi/Rishikesh,+Uttarakhand",
};

const TRAIN_DATA: TrainReach = {
  mode: "train",
  nearestStation: "Haridwar Junction (HW)",
  distanceFromRishikesh: 26,
  etaFromStation: "45 – 60 mins by taxi / shared jeep",
  trainOptions: [
    {
      name: "Dehradun Shatabdi Express (12017/12018)",
      from: "New Delhi",
      departureWindow: "6:50 AM from NDLS",
      durationLabel: "4 hrs 40 mins to Haridwar",
      note: "Fastest option from Delhi; premium class seating.",
    },
    {
      name: "Mussoorie Express (14041/14042)",
      from: "Delhi Sarai Rohilla",
      departureWindow: "10:05 PM (overnight)",
      durationLabel: "6 hrs to Haridwar",
      note: "Sleeper option; arrives Haridwar early morning — ideal timing for Rishikesh.",
    },
    {
      name: "Rishikesh–Delhi Special (via Haridwar)",
      from: "Multiple origins",
      departureWindow: "Check IRCTC for schedule",
      durationLabel: "5 – 7 hrs depending on origin",
      note: "Seasonal trains run directly; check availability on irctc.co.in.",
    },
  ],
  localTransport:
    "From Haridwar Junction: shared tempos and jeeps to Rishikesh bus stand run every 20 min (₹30–50). Private taxis cost ₹400–600.",
  tips: [
    "Book Shatabdi at least 15 days in advance — sells out fast in peak season.",
    "Haridwar Junction is better connected than Rishikesh's own station (Yog Nagari) — check schedules.",
    "Yog Nagari Rishikesh station (YGNR) has limited trains; Haridwar is the hub.",
  ],
};

const FLIGHT_DATA: FlightReach = {
  mode: "flight",
  nearestAirport: "Jolly Grant Airport, Dehradun",
  airportCode: "DED",
  distanceFromRishikesh: 35,
  etaFromAirport: "45 – 60 mins by taxi",
  airlines: [
    "IndiGo (Delhi–Dehradun, multiple daily)",
    "Air India (Delhi–Dehradun)",
    "SpiceJet (select routes)",
    "Vistara (select routes)",
  ],
  taxiEstimate: {
    minINR: 800,
    maxINR: 1400,
    etaMinutes: 50,
    note:
      "Pre-paid taxi counters at Jolly Grant Airport. Ola/Uber also available but surge pricing applies on weekends.",
  },
  tips: [
    "Dehradun flights are weather-dependent — fog cancellations common Dec–Jan.",
    "Book DED–DEL in advance; capacity is limited (small airport).",
    "Pre-book taxi from airport — surge pricing at baggage claim can be 2×.",
    "Last major ATM is in Rishikesh market; Jolly Grant Airport has a single ATM.",
  ],
};

// ── Optional: OpenRouteService live ETA ──────────────────────────────────────

interface ORSResponse {
  features: Array<{
    properties: {
      summary: {
        distance: number;
        duration: number;
      };
    };
  }>;
}

async function fetchLiveRoadEta(): Promise<{ distanceKm: number; etaMinutes: number } | null> {
  if (!config.ORS_API_KEY) return null;

  try {
    const response = await axios.get<ORSResponse>(
      "https://api.openrouteservice.org/v2/directions/driving-car",
      {
        params: {
          api_key: config.ORS_API_KEY,
          start: "77.2090,28.6139", // New Delhi
          end: "78.2676,30.0869",   // Rishikesh
        },
        timeout: 5_000,
      }
    );

    const summary = response.data.features[0]?.properties.summary;
    if (!summary) return null;

    return {
      distanceKm: Math.round(summary.distance / 1000),
      etaMinutes: Math.round(summary.duration / 60),
    };
  } catch (err) {
    logger.warn({ err }, "Reach: ORS API call failed, using static data");
    return null;
  }
}

// ── Public service ─────────────────────────────────────────────────────────────

export async function getRoadReach(): Promise<RoadReach> {
  return getOrSet("reach:road", 3600, async () => {
    const live = await fetchLiveRoadEta();
    if (live) {
      return {
        ...ROAD_DATA,
        distanceKm: live.distanceKm,
        etaLabel: `${Math.floor(live.etaMinutes / 60)} – ${Math.ceil(live.etaMinutes / 60) + 1} hrs`,
      };
    }
    return ROAD_DATA;
  });
}

export async function getTrainReach(): Promise<TrainReach> {
  return getOrSet("reach:train", 3600, async () => TRAIN_DATA);
}

export async function getFlightReach(): Promise<FlightReach> {
  return getOrSet("reach:flight", 3600, async () => FLIGHT_DATA);
}
