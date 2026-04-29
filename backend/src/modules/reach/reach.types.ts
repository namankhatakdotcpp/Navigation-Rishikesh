export type ReachMode = "road" | "train" | "flight";

export interface RouteSegment {
  from: string;
  to: string;
  distanceKm: number;
  etaMinutes: number;
  etaLabel: string;
  description: string;
}

export interface RoadReach {
  mode: "road";
  origin: string;
  destination: string;
  distanceKm: number;
  etaLabel: string;
  routes: Array<{
    name: string;
    description: string;
    distanceKm: number;
    etaLabel: string;
    highlights: string[];
    recommended: boolean;
  }>;
  tips: string[];
  googleMapsUrl: string;
}

export interface TrainReach {
  mode: "train";
  nearestStation: string;
  distanceFromRishikesh: number;
  etaFromStation: string;
  trainOptions: Array<{
    name: string;
    from: string;
    departureWindow: string;
    durationLabel: string;
    note: string;
  }>;
  localTransport: string;
  tips: string[];
}

export interface FlightReach {
  mode: "flight";
  nearestAirport: string;
  airportCode: string;
  distanceFromRishikesh: number;
  etaFromAirport: string;
  airlines: string[];
  taxiEstimate: {
    minINR: number;
    maxINR: number;
    etaMinutes: number;
    note: string;
  };
  tips: string[];
}

export interface ReachApiResponse {
  success: true;
  data: RoadReach | TrainReach | FlightReach;
}
