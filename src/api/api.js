const backendURL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const parseJsonResponse = async (res) => {
  const text = await res.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch (err) {
    const trimmed = text.trim();
    const message = trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")
      ? `Server returned HTML instead of JSON (${res.status} ${res.statusText}).`
      : `Invalid JSON response from server: ${trimmed}`;
    const parseError = new Error(message);
    parseError.status = res.status;
    parseError.responseText = text;
    throw parseError;
  }
};

// ─── Authentication ────────────────────────────────────────────────────────────

// ─── Existing Routes ───────────────────────────────────────────────────────────

export const getRoutes = async () => {
  const res = await fetch(`${backendURL}/api/admin/routes`);
  const data = await parseJsonResponse(res);
  if (!res.ok || data.status !== "success") throw new Error(data.message || "Failed to load routes");
  return data.routes || [];
};

export const getFare = async (routeNo) => {
  if (!routeNo) return null;
  const res = await fetch(`${backendURL}/api/fares?route_no=${routeNo}`);
  const data = await parseJsonResponse(res);
  if (!res.ok || data.status === "error") throw new Error(data.message || "Failed to load fare");
  return data.route;
};

// ─── Places (from MongoDB) ─────────────────────────────────────────────────────

// GET all places — uses same endpoint as admin so data shape (fares.tiers) always matches
export const getAllPlaces = async () => {
  const res = await fetch(`${backendURL}/api/admin/places`);
  const data = await parseJsonResponse(res);
  if (!res.ok) throw new Error(data.message || "Failed to fetch places");
  // Admin endpoint returns { status, places: [...] }; public endpoint returns array directly.
  // Handle both shapes so this works regardless of backend version.
  if (data && data.status === "success" && Array.isArray(data.places)) {
    return data.places;
  }
  return Array.isArray(data) ? data : [];
};

// GET places filtered by category (landmark | zone | barangay | sitio)
export const getPlacesByCategory = async (category) => {
  const res = await fetch(`${backendURL}/api/places?category=${category}`);
  const data = await parseJsonResponse(res);
  if (!res.ok) throw new Error(data.message || `Failed to fetch places for category: ${category}`);
  return data;
};

// GET only places that have fare data
export const getPlacesWithFares = async () => {
  const res = await fetch(`${backendURL}/api/places/fares`);
  const data = await parseJsonResponse(res);
  if (!res.ok) throw new Error(data.message || "Failed to fetch places with fares");
  return data;
};

// GET a single place by name
export const getPlaceByName = async (name) => {
  const res = await fetch(`${backendURL}/api/places/name/${encodeURIComponent(name)}`);
  const data = await parseJsonResponse(res);
  if (!res.ok) throw new Error(data.message || `Place not found: ${name}`);
  return data;
};

// GET a single place by MongoDB ID
export const getPlaceById = async (id) => {
  const res = await fetch(`${backendURL}/api/places/${id}`);
  const data = await parseJsonResponse(res);
  if (!res.ok) throw new Error(data.message || `Place not found: ${id}`);
  return data;
};

// ─── Fare Calculation (NEW — logic moved to backend) ──────────────────────────

/**
 * Calculate the tricycle fare using the backend fare engine.
 *
 * @param {string} origin        - Place name (from)
 * @param {string} destination   - Place name (to)
 * @param {string} passengerType - "regular" | "student" | "pwd" | "senior"
 * @returns {Promise<{ origin, destination, fareInfo }>}
 */
export const calculateFare = async (origin, destination, passengerType = "regular") => {
  const res = await fetch(`${backendURL}/api/fare/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ origin, destination, passengerType }),
  });

  const data = await parseJsonResponse(res);

  if (!res.ok || data.status === "error") {
    const err = new Error(data.message || "Fare calculation failed");
    err.tooClose = data.tooClose ?? false;
    throw err;
  }

  return data; // { status, origin, destination, fareInfo }
};

/**
 * Fetch the passenger-type lookup table from the backend.
 */
export const getPassengerTypes = async () => {
  const res = await fetch(`${backendURL}/api/fare/passenger-types`);
  const data = await parseJsonResponse(res);
  if (!res.ok) throw new Error(data.message || "Failed to fetch passenger types");
  return data.passengerTypes ?? [];
};

/**
 * Fetch OSRM route geometry via the backend proxy.
 * Returns { geometry (GeoJSON LineString), distance_km, duration_min } or null.
 *
 * @param {[number, number]} fromCoords - [lng, lat]
 * @param {[number, number]} toCoords   - [lng, lat]
 */
export const getRouteGeometry = async (fromCoords, toCoords) => {
  const [fLng, fLat] = fromCoords;
  const [tLng, tLat] = toCoords;
  const res = await fetch(
    `${backendURL}/api/fare/route-geometry?fromLng=${fLng}&fromLat=${fLat}&toLng=${tLng}&toLat=${tLat}`
  );
  const data = await parseJsonResponse(res);
  if (!res.ok || data.status === "error") return null;
  return data; // { status, geometry, distance_km, duration_min }
};

// ─── Admin API ─────────────────────────────────────────────────────────────────

/** GET all places (admin view — full fares.tiers shape). */
export const adminGetPlaces = async () => {
  const res = await fetch(`${backendURL}/api/admin/places`);
  const data = await parseJsonResponse(res);
  if (!res.ok) throw new Error(data.message || "Failed to load places");
  return data.places ?? [];
};

/** GET the current active gasoline tier key (e.g. "50-59"). */
export const adminGetActiveTier = async () => {
  const res = await fetch(`${backendURL}/api/admin/settings/active-tier`);
  const data = await parseJsonResponse(res);
  if (!res.ok) throw new Error(data.message || "Failed to load active tier");
  return data.activeTier ?? "50-59";
};

/**
 * PUT — set the active gasoline tier.
 * @param {string} tierKey  e.g. "60-69"
 * @returns {Promise<string>} the saved tierKey
 */
export const adminSetActiveTier = async (tierKey) => {
  const res = await fetch(`${backendURL}/api/admin/settings/active-tier`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ activeTier: tierKey }),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok || data.status !== "success")
    throw new Error(data.message || "Failed to save tier");
  return tierKey;
};

/**
 * PUT — update an existing place by MongoDB _id.
 * @param {string} id       MongoDB _id
 * @param {object} payload  { fares, distance, coords }
 * @returns {Promise<object>} updated place document
 */
export const adminUpdatePlace = async (id, payload) => {
  const res = await fetch(`${backendURL}/api/admin/places/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok || data.status !== "success")
    throw new Error(data.message || "Failed to update place");
  return data.place;
};

/**
 * DELETE — remove a place by MongoDB _id.
 * @param {string} id  MongoDB _id
 */
export const adminDeletePlace = async (id) => {
  const res = await fetch(`${backendURL}/api/admin/places/${id}`, {
    method: "DELETE",
  });
  const data = await parseJsonResponse(res);
  if (!res.ok || data.status !== "success")
    throw new Error(data.message || "Failed to delete place");
};

/**
 * POST — create a new place.
 * @param {object} payload  { name, category, distance, coords, fares }
 * @returns {Promise<object>} created place document
 */
export const adminAddPlace = async (payload) => {
  const res = await fetch(`${backendURL}/api/admin/places`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok || data.status !== "success")
    throw new Error(data.message || "Failed to add place");
  return data.place;
};
