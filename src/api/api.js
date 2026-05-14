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

// ─── JWT helper ───────────────────────────────────────────────────────────────
// All admin API calls include the JWT stored in sessionStorage.
const adminAuthHeader = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${sessionStorage.getItem("adminJwt") || ""}`,
});

// ─── Authentication ───────────────────────────────────────────────────────────

/**
 * Send the Google OAuth access_token to the backend for verification.
 * The backend checks it against Google's API and the admins collection in MongoDB.
 * Returns { token, email, name } on success.
 */
export const adminVerifyGoogleToken = async (accessToken) => {
  const res = await fetch(`${backendURL}/api/admin/auth/google`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ accessToken }),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok || data.status !== "success") {
    const err = new Error(data.message || "Authentication failed.");
    err.status = res.status;
    throw err;
  }
  return data; // { status, token, email, name }
};

// ─── Existing Routes ──────────────────────────────────────────────────────────

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

// ─── Places (public) ──────────────────────────────────────────────────────────

export const getAllPlaces = async () => {
  const res = await fetch(`${backendURL}/api/places`);
  const data = await parseJsonResponse(res);
  if (!res.ok) throw new Error(data.message || "Failed to fetch places");
  if (data && data.status === "success" && Array.isArray(data.places)) return data.places;
  return Array.isArray(data) ? data : [];
};

export const getPlacesByCategory = async (category) => {
  const res = await fetch(`${backendURL}/api/places?category=${category}`);
  const data = await parseJsonResponse(res);
  if (!res.ok) throw new Error(data.message || `Failed to fetch places for category: ${category}`);
  return data;
};

export const getPlacesWithFares = async () => {
  const res = await fetch(`${backendURL}/api/places/fares`);
  const data = await parseJsonResponse(res);
  if (!res.ok) throw new Error(data.message || "Failed to fetch places with fares");
  return data;
};

export const getPlaceByName = async (name) => {
  const res = await fetch(`${backendURL}/api/places/name/${encodeURIComponent(name)}`);
  const data = await parseJsonResponse(res);
  if (!res.ok) throw new Error(data.message || `Place not found: ${name}`);
  return data;
};

export const getPlaceById = async (id) => {
  const res = await fetch(`${backendURL}/api/places/${id}`);
  const data = await parseJsonResponse(res);
  if (!res.ok) throw new Error(data.message || `Place not found: ${id}`);
  return data;
};

// ─── Fare Calculation ─────────────────────────────────────────────────────────

export const calculateFare = async (origin, destination, passengerType = "regular") => {
  const res = await fetch(`${backendURL}/api/fare/calculate`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ origin, destination, passengerType }),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok || data.status === "error") {
    const err = new Error(data.message || "Fare calculation failed");
    err.tooClose = data.tooClose ?? false;
    throw err;
  }
  return data;
};

export const getPassengerTypes = async () => {
  const res = await fetch(`${backendURL}/api/fare/passenger-types`);
  const data = await parseJsonResponse(res);
  if (!res.ok) throw new Error(data.message || "Failed to fetch passenger types");
  return data.passengerTypes ?? [];
};

export const getRouteGeometry = async (fromCoords, toCoords) => {
  const [fLng, fLat] = fromCoords;
  const [tLng, tLat] = toCoords;
  const res = await fetch(
    `${backendURL}/api/fare/route-geometry?fromLng=${fLng}&fromLat=${fLat}&toLng=${tLng}&toLat=${tLat}`
  );
  const data = await parseJsonResponse(res);
  if (!res.ok || data.status === "error") return null;
  return data;
};

// ─── Admin API (all protected by JWT) ────────────────────────────────────────

/** GET all places — requires admin JWT. */
export const adminGetPlaces = async () => {
  const res = await fetch(`${backendURL}/api/admin/places`, {
    headers: adminAuthHeader(),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok) throw new Error(data.message || "Failed to load places");
  return data.places ?? [];
};

/** GET the current active gasoline tier key. */
export const adminGetActiveTier = async () => {
  const res = await fetch(`${backendURL}/api/admin/settings/active-tier`, {
    headers: adminAuthHeader(),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok) throw new Error(data.message || "Failed to load active tier");
  return data.activeTier ?? "50-59";
};

/** PUT — set the active gasoline tier. */
export const adminSetActiveTier = async (tierKey) => {
  const res = await fetch(`${backendURL}/api/admin/settings/active-tier`, {
    method:  "PUT",
    headers: adminAuthHeader(),
    body:    JSON.stringify({ activeTier: tierKey }),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok || data.status !== "success")
    throw new Error(data.message || "Failed to save tier");
  return tierKey;
};

/** PUT — update an existing place by MongoDB _id. */
export const adminUpdatePlace = async (id, payload) => {
  const res = await fetch(`${backendURL}/api/admin/places/${id}`, {
    method:  "PUT",
    headers: adminAuthHeader(),
    body:    JSON.stringify(payload),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok || data.status !== "success")
    throw new Error(data.message || "Failed to update place");
  return data.place;
};

/** DELETE — remove a place by MongoDB _id. */
export const adminDeletePlace = async (id) => {
  const res = await fetch(`${backendURL}/api/admin/places/${id}`, {
    method:  "DELETE",
    headers: adminAuthHeader(),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok || data.status !== "success")
    throw new Error(data.message || "Failed to delete place");
};

/** POST — create a new place. */
export const adminAddPlace = async (payload) => {
  const res = await fetch(`${backendURL}/api/admin/places`, {
    method:  "POST",
    headers: adminAuthHeader(),
    body:    JSON.stringify(payload),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok || data.status !== "success")
    throw new Error(data.message || "Failed to add place");
  return data.place;
};
