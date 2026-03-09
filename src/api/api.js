const backendURL = import.meta.env.VITE_BACKEND_URL || "https://triketrafficcheckerbackend.onrender.com";

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
