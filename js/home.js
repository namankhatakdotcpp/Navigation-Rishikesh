const RISHIKESH_COORDS = { lat: 30.0869, lng: 78.2676 };
const RTG_CONFIG = window.RTG_CONFIG || {};
const WEATHERSTACK_API_KEY = RTG_CONFIG.WEATHERSTACK_API_KEY || "";
const WEATHERSTACK_API_BASE_URL = RTG_CONFIG.WEATHERSTACK_API_BASE_URL || "http://api.weatherstack.com/current";
const WEATHERSTACK_QUERY = RTG_CONFIG.WEATHERSTACK_QUERY || "Rishikesh,India";
const LEAFLET_TILE_URL = RTG_CONFIG.LEAFLET_TILE_URL || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const LEAFLET_ATTRIBUTION = RTG_CONFIG.LEAFLET_ATTRIBUTION || "&copy; OpenStreetMap contributors";
const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";

const mapState = {
  map: null,
  destinationMarker: null,
  routingControl: null,
};

const REACH_ROAD_URL = "https://www.google.com/maps/dir/?api=1&destination=Rishikesh";

let skyconsInstance = null;

const MOCK_WEATHER = {
  city: "Rishikesh",
  country: "IN",
  temp: 27,
  feelsLike: 29,
  humidity: 62,
  windSpeed: 3,
  description: "partly cloudy",
  icon: "03d",
};

function formatNumber(value, suffix = "") {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "--";
  }

  return `${Math.round(value)}${suffix}`;
}

function setWeatherStatus(message, isError = false) {
  const status = document.getElementById("weather-status");
  if (!status) {
    return;
  }

  status.textContent = message;
  status.classList.toggle("is-error", isError);
}

function getSkyconsType(description = "") {
  const normalized = description.toLowerCase();

  if (normalized.includes("snow") || normalized.includes("ice")) {
    return window.Skycons.SNOW;
  }

  if (normalized.includes("rain") || normalized.includes("drizzle") || normalized.includes("shower")) {
    return window.Skycons.RAIN;
  }

  if (normalized.includes("fog") || normalized.includes("mist") || normalized.includes("haze") || normalized.includes("smoke")) {
    return window.Skycons.FOG;
  }

  if (normalized.includes("wind") || normalized.includes("breeze") || normalized.includes("gust")) {
    return window.Skycons.WIND;
  }

  if (normalized.includes("cloud") || normalized.includes("overcast")) {
    return window.Skycons.CLOUDY;
  }

  if (normalized.includes("partly") || normalized.includes("sun")) {
    return window.Skycons.PARTLY_CLOUDY_DAY;
  }

  return window.Skycons.CLEAR_DAY;
}

function setSkyconsIcon(description) {
  const canvasId = "weather-icon-canvas";
  if (!window.Skycons || !document.getElementById(canvasId)) {
    return;
  }

  if (!skyconsInstance) {
    const iconColor = getComputedStyle(document.documentElement).getPropertyValue("--color-primary-strong").trim() || "#1e6456";
    skyconsInstance = new window.Skycons({ color: iconColor });
  }

  skyconsInstance.add(canvasId, getSkyconsType(description));
  skyconsInstance.play();
}

async function initWeatherWidget() {
  const tempEl = document.getElementById("weather-temp");
  const descEl = document.getElementById("weather-desc");
  const iconCanvasEl = document.getElementById("weather-icon-canvas");
  const placeEl = document.getElementById("weather-place");
  const feelsLikeEl = document.getElementById("weather-feels-like");
  const humidityEl = document.getElementById("weather-humidity");
  const windEl = document.getElementById("weather-wind");

  if (!tempEl || !descEl || !iconCanvasEl || !placeEl || !feelsLikeEl || !humidityEl || !windEl) {
    return;
  }

  try {
    let payload = MOCK_WEATHER;

    if (WEATHERSTACK_API_KEY) {
      if (window.location.protocol === "https:" && WEATHERSTACK_API_BASE_URL.startsWith("http://")) {
        throw new Error("Mixed content blocked: Weatherstack free plan uses HTTP only. Use a proxy for HTTPS sites.");
      }

      setWeatherStatus("Fetching latest weather...");

      const query = new URLSearchParams({
        access_key: WEATHERSTACK_API_KEY,
        query: WEATHERSTACK_QUERY,
        units: "m",
      });

      const response = await fetch(`${WEATHERSTACK_API_BASE_URL}?${query.toString()}`, {
        headers: {
          Accept: "application/json",
        },
      });

      const weatherPayload = await response.json();
      if (!response.ok || weatherPayload.success === false) {
        const apiError = weatherPayload.error?.info || weatherPayload.error?.type || weatherPayload.message;
        throw new Error(apiError || "Weather request failed");
      }

      payload = {
        city: weatherPayload.location?.name || "Rishikesh",
        country: weatherPayload.location?.country || "IN",
        temp: weatherPayload.current?.temperature,
        feelsLike: weatherPayload.current?.feelslike,
        humidity: weatherPayload.current?.humidity,
        windSpeed: weatherPayload.current?.wind_speed,
        description: weatherPayload.current?.weather_descriptions?.[0] || "clear sky",
        icon: weatherPayload.current?.weather_icons?.[0] || "",
      };
    } else {
      setWeatherStatus("Showing demo weather. Add WEATHERSTACK_API_KEY in js/config.js for live data.");
    }

    placeEl.textContent = `${payload.city}, ${payload.country}`;
    tempEl.textContent = `${formatNumber(payload.temp, " C")}`;
    descEl.textContent = payload.description;
    feelsLikeEl.textContent = formatNumber(payload.feelsLike, " C");
    humidityEl.textContent = formatNumber(payload.humidity, "%");
    windEl.textContent = formatNumber(payload.windSpeed, " km/h");
    setSkyconsIcon(payload.description);

    if (WEATHERSTACK_API_KEY) {
      setWeatherStatus("Live weather updated.");
    }
  } catch (error) {
    setWeatherStatus(`${error.message || "Unable to load weather right now."} Showing demo weather.`, true);

    placeEl.textContent = `${MOCK_WEATHER.city}, ${MOCK_WEATHER.country}`;
    tempEl.textContent = `${formatNumber(MOCK_WEATHER.temp, " C")}`;
    descEl.textContent = MOCK_WEATHER.description;
    feelsLikeEl.textContent = formatNumber(MOCK_WEATHER.feelsLike, " C");
    humidityEl.textContent = formatNumber(MOCK_WEATHER.humidity, "%");
    windEl.textContent = formatNumber(MOCK_WEATHER.windSpeed, " km/h");
    setSkyconsIcon(MOCK_WEATHER.description);
  }
}

function setMapStatus(message, isError = false) {
  const status = document.getElementById("map-status");
  if (!status) {
    return;
  }

  status.textContent = message;
  status.classList.toggle("is-error", isError);
}

async function searchLocation() {
  const searchBox = document.getElementById("searchBox");
  if (!searchBox || !mapState.map || !window.L) {
    return;
  }

  const query = searchBox.value.trim();
  if (!query) {
    setMapStatus("Enter a location to search.", true);
    return;
  }

  try {
    setMapStatus("Searching location...");

    const response = await fetch(`${NOMINATIM_SEARCH_URL}?format=json&limit=1&q=${encodeURIComponent(query)}`, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Search request failed.");
    }

    const data = await response.json();
    if (!Array.isArray(data) || !data.length) {
      setMapStatus("No location found for that search.", true);
      return;
    }

    const lat = Number(data[0].lat);
    const lng = Number(data[0].lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setMapStatus("Location coordinates were invalid.", true);
      return;
    }

    mapState.map.setView([lat, lng], 13);

    if (mapState.destinationMarker) {
      mapState.destinationMarker.setLatLng([lat, lng]).bindPopup(query).openPopup();
    } else {
      mapState.destinationMarker = window.L.marker([lat, lng]).addTo(mapState.map).bindPopup(query).openPopup();
    }

    if (mapState.routingControl) {
      const currentWaypoints = mapState.routingControl.getWaypoints();
      const start = currentWaypoints?.[0]?.latLng || window.L.latLng(RISHIKESH_COORDS.lat, RISHIKESH_COORDS.lng);
      mapState.routingControl.setWaypoints([start, window.L.latLng(lat, lng)]);
    }

    setMapStatus(`Showing result for ${query}.`);
  } catch (error) {
    setMapStatus(error.message || "Unable to search location right now.", true);
  }
}

function getDirections() {
  if (!mapState.map || !window.L) {
    return;
  }

  if (!window.L.Routing || !window.L.Routing.control) {
    setMapStatus("Directions plugin did not load. Check CDN access.", true);
    return;
  }

  if (!navigator.geolocation) {
    setMapStatus("Geolocation is not supported in this browser.", true);
    return;
  }

  setMapStatus("Getting your current location...");

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const origin = window.L.latLng(position.coords.latitude, position.coords.longitude);
      const destination = mapState.destinationMarker
        ? mapState.destinationMarker.getLatLng()
        : window.L.latLng(RISHIKESH_COORDS.lat, RISHIKESH_COORDS.lng);

      if (!mapState.routingControl) {
        mapState.routingControl = window.L.Routing.control({
          waypoints: [origin, destination],
          routeWhileDragging: false,
          addWaypoints: false,
          draggableWaypoints: false,
          showAlternatives: false,
          lineOptions: {
            styles: [{ color: "#1e6456", opacity: 0.9, weight: 6 }],
          },
          createMarker: () => null,
        }).addTo(mapState.map);
      } else {
        mapState.routingControl.setWaypoints([origin, destination]);
      }

      mapState.map.fitBounds(window.L.latLngBounds([origin, destination]), {
        padding: [40, 40],
      });
      setMapStatus("Turn-by-turn route loaded.");
    },
    (error) => {
      setMapStatus(error.message || "Unable to access your location.", true);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    }
  );
}

function initMapWidget() {
  const mapContainer = document.getElementById("map");
  const searchButton = document.getElementById("searchBtn");
  const directionsButton = document.getElementById("directionsBtn");
  const searchBox = document.getElementById("searchBox");

  if (!mapContainer) {
    return;
  }

  if (!window.L) {
    setMapStatus("Leaflet did not load. Check CDN access.", true);
    return;
  }

  mapState.map = window.L.map(mapContainer).setView([RISHIKESH_COORDS.lat, RISHIKESH_COORDS.lng], 13);

  window.L.tileLayer(LEAFLET_TILE_URL, {
    attribution: LEAFLET_ATTRIBUTION,
  }).addTo(mapState.map);

  mapState.destinationMarker = window.L
    .marker([RISHIKESH_COORDS.lat, RISHIKESH_COORDS.lng])
    .addTo(mapState.map)
    .bindPopup("Rishikesh")
    .openPopup();

  searchButton?.addEventListener("click", searchLocation);
  directionsButton?.addEventListener("click", getDirections);
  searchBox?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      searchLocation();
    }
  });

  window.setTimeout(() => {
    mapState.map?.invalidateSize();
  }, 0);

  setMapStatus("Interactive map loaded. Search a place or get directions from your location.");
}

function getFlightSuggestion() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Morning arrivals usually get faster transfers into town.";
  }

  if (hour < 18) {
    return "Afternoon arrivals are usually smooth, but keep a buffer for check-in traffic.";
  }

  return "Evening arrivals can take longer, so pre-booking a taxi is the safer option.";
}

function renderReachOutput(type) {
  const output = document.getElementById("reach-output");
  if (!output) {
    return;
  }

  if (type === "road") {
    output.innerHTML = `
      <h4>Road Route Opened</h4>
      <p>Google Maps navigation has been opened for travel to Rishikesh.</p>
      <p class="reach-output__insight">Tip: Leaving Delhi early usually helps you avoid slower traffic around Haridwar.</p>
    `;
    window.open(REACH_ROAD_URL, "_blank", "noopener");
    return;
  }

  if (type === "train") {
    output.innerHTML = `
      <h4>Nearest Railway Stations</h4>
      <ul>
        <li><strong>Rishikesh Railway Station</strong> - around 5 km, about 15 minutes.</li>
        <li><strong>Haridwar Junction</strong> - around 25 km, about 45 minutes.</li>
      </ul>
      <p class="reach-output__insight">Tip: Haridwar usually gives you better train frequency and more reliable connections.</p>
    `;
    return;
  }

  output.innerHTML = `
    <h4>Smart Travel Insight</h4>
    <p><strong>Jolly Grant Airport, Dehradun</strong> is the nearest airport to Rishikesh.</p>
    <p>Distance: about 21 km. Typical transfer time: around 40 minutes.</p>
    <p>Taxi estimate: roughly INR 600 to INR 1200 depending on timing and luggage.</p>
    <p class="reach-output__insight">${getFlightSuggestion()}</p>
  `;
}

function initReachSection() {
  const cards = document.querySelectorAll("[data-reach-type]");
  if (!cards.length) {
    return;
  }

  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const type = card.getAttribute("data-reach-type");
      if (!type) {
        return;
      }

      cards.forEach((item) => item.classList.toggle("is-active", item === card));
      renderReachOutput(type);
    });
  });

  const defaultCard = cards[0];
  defaultCard.classList.add("is-active");
  renderReachOutput(defaultCard.getAttribute("data-reach-type") || "flight");
}

document.addEventListener("DOMContentLoaded", () => {
  initWeatherWidget();
  initMapWidget();
  initReachSection();

  window.searchLocation = searchLocation;
  window.getDirections = getDirections;
});
