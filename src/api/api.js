const backendURL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000" // ← fixed fallback;
// ─── Authentication ───────────────────────────────────────────────
// ─── Existing Routes ───────────────────────────────────────────────

export const getRoutes = async () => {
  const res = await fetch(`${backendURL}/api/admin/routes`);
  const data = await res.json();
  if (data.status !== "success") throw new Error(data.message || "Failed to load routes");
  return data.routes || [];
};

export const getFare = async (routeNo) => {
  if (!routeNo) return null;
  const res = await fetch(`${backendURL}/api/fares?route_no=${routeNo}`);
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  return data.route;
};

// ─── Places (from MongoDB) ─────────────────────────────────────────

// GET all places — uses same endpoint as admin so data shape (fares.tiers) always matches
export const getAllPlaces = async () => {
  const res = await fetch(`${backendURL}/api/admin/places`);
  if (!res.ok) throw new Error("Failed to fetch places");
  const data = await res.json();
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
  if (!res.ok) throw new Error(`Failed to fetch places for category: ${category}`);
  return res.json();
};

// GET only places that have fare data
export const getPlacesWithFares = async () => {
  const res = await fetch(`${backendURL}/api/places/fares`);
  if (!res.ok) throw new Error("Failed to fetch places with fares");
  return res.json();
};

// GET a single place by name
export const getPlaceByName = async (name) => {
  const res = await fetch(`${backendURL}/api/places/name/${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error(`Place not found: ${name}`);
  return res.json();
};

// GET a single place by MongoDB ID
export const getPlaceById = async (id) => {
  const res = await fetch(`${backendURL}/api/places/${id}`);
  if (!res.ok) throw new Error(`Place not found: ${id}`);
  return res.json();
};