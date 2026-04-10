import React, { useState, useEffect, useRef, useCallback } from "react";
import { getAllPlaces } from "../../api/api";
import "./RouteMapChecker.css";

const MAP_CENTER = [123.8745, 12.673];
const MAP_ZOOM   = 13;
const MAP_STYLE  = "https://tiles.openfreemap.org/styles/liberty";
const OSRM_BASE  = "https://router.project-osrm.org/route/v1/driving";

const dist2D = (a, b) =>
  Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2));

// ── helper: extract [lng, lat] from either format ─────────────────────────────
// Old format: coords = [lng, lat]
// New format: coords = { type: "Point", coordinates: [lng, lat] }
const getCoords = (place) => {
  if (!place?.coords) return null;
  if (Array.isArray(place.coords)) return place.coords;
  if (place.coords.coordinates && Array.isArray(place.coords.coordinates)) {
    return place.coords.coordinates;
  }
  return null;
};

export default function RouteMapChecker({
  isDarkMode    = true,
  prefilledFrom = "",
  prefilledTo   = "",
  autoOpen      = false,
  hideForm      = false,
  onClose       = null,
}) {
  const [bulanPlaces,   setBulanPlaces]   = useState([]);
  const [placesLoading, setPlacesLoading] = useState(true);
  const [placesError,   setPlacesError]   = useState("");

  const [fromVal,    setFromVal]    = useState(prefilledFrom);
  const [toVal,      setToVal]      = useState(prefilledTo);
  const [fromSearch, setFromSearch] = useState(prefilledFrom);
  const [toSearch,   setToSearch]   = useState(prefilledTo);
  const [fromOpen,   setFromOpen]   = useState(false);
  const [toOpen,     setToOpen]     = useState(false);

  const [showMapModal, setShowMapModal] = useState(
    autoOpen && !!prefilledFrom && !!prefilledTo
  );

  const [confirmed,     setConfirmed]     = useState(!!(prefilledFrom && prefilledTo));
  const [validationMsg, setValidationMsg] = useState("");

  const [routeStatus, setRouteStatus] = useState("idle");
  const [routeInfo,   setRouteInfo]   = useState(null);

  const mapContainerRef = useRef(null);
  const mapInstanceRef  = useRef(null);
  const mapLoadedRef    = useRef(false);
  const markersRef      = useRef([]);
  const routeDrawnRef   = useRef(false);

  // Fetch places — filter only those with valid coords (either format)
  useEffect(() => {
    getAllPlaces()
      .then((data) => {
        const valid = data.filter((p) => getCoords(p) !== null);
        setBulanPlaces(valid);
      })
      .catch((err) => setPlacesError(err.message))
      .finally(() => setPlacesLoading(false));
  }, []);

  // Auto-detect nearest place via geolocation
  useEffect(() => {
    if (prefilledFrom || !navigator.geolocation || bulanPlaces.length === 0) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const user = [pos.coords.longitude, pos.coords.latitude];
      let nearest = bulanPlaces[0];
      let minD = Infinity;
      bulanPlaces.forEach((p) => {
        const c = getCoords(p);
        if (!c) return;
        const d = dist2D(c, user);
        if (d < minD) { minD = d; nearest = p; }
      });
      setFromVal(nearest.name);
      setFromSearch(nearest.name);
    });
  }, [bulanPlaces]);

  const filteredFrom = bulanPlaces.filter((p) =>
    p.name.toLowerCase().includes(fromSearch.toLowerCase())
  );
  const filteredTo = bulanPlaces.filter((p) =>
    p.name.toLowerCase().includes(toSearch.toLowerCase())
  );

  const initOrResizeMap = useCallback(() => {
    if (!mapContainerRef.current || !window.maplibregl) return;
    if (mapInstanceRef.current) {
      setTimeout(() => mapInstanceRef.current?.resize(), 80);
      return;
    }
    const map = new window.maplibregl.Map({
      container: mapContainerRef.current,
      style:     MAP_STYLE,
      center:    MAP_CENTER,
      zoom:      MAP_ZOOM,
    });
    map.addControl(new window.maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => { mapLoadedRef.current = true; });
    mapInstanceRef.current = map;
  }, []);

  const drawRoute = useCallback(async () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const waitForLoad = () =>
      new Promise((res) => {
        if (mapLoadedRef.current) return res();
        map.once("load", res);
      });

    await waitForLoad();

    setRouteStatus("loading");
    setRouteInfo(null);
    routeDrawnRef.current = true;

    // Clear old markers and route
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    if (map.getSource("rmc-route")) {
      map.removeLayer("rmc-route");
      map.removeSource("rmc-route");
    }

    const origin = bulanPlaces.find((p) => p.name === fromVal);
    const dest   = bulanPlaces.find((p) => p.name === toVal);

    if (!origin || !dest) { setRouteStatus("error"); return; }

    // ── Use getCoords() for both markers ──────────────────────────────────────
    const originCoords = getCoords(origin);
    const destCoords   = getCoords(dest);

    if (!originCoords || !destCoords) { setRouteStatus("error"); return; }

    const mk1 = new window.maplibregl.Marker({ color: "#22c55e" })
      .setLngLat(originCoords)
      .setPopup(new window.maplibregl.Popup({ offset: 25 }).setText(`FROM: ${origin.name}`))
      .addTo(map);

    const mk2 = new window.maplibregl.Marker({ color: "#ef4444" })
      .setLngLat(destCoords)
      .setPopup(new window.maplibregl.Popup({ offset: 25 }).setText(`TO: ${dest.name}`))
      .addTo(map);

    markersRef.current = [mk1, mk2];

    try {
      const url = `${OSRM_BASE}/${originCoords[0]},${originCoords[1]};${destCoords[0]},${destCoords[1]}?overview=full&geometries=geojson`;
      const res  = await fetch(url);
      const data = await res.json();

      if (!data.routes?.length) { setRouteStatus("error"); return; }

      const route = data.routes[0];
      map.addSource("rmc-route", {
        type: "geojson",
        data: { type: "Feature", geometry: route.geometry },
      });
      map.addLayer({
        id:     "rmc-route",
        type:   "line",
        source: "rmc-route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint:  { "line-color": "#22c55e", "line-width": 5, "line-opacity": 0.9 },
      });

      const bounds = new window.maplibregl.LngLatBounds();
      route.geometry.coordinates.forEach((c) => bounds.extend(c));
      map.fitBounds(bounds, { padding: 80, duration: 800 });

      const km  = (route.legs[0].distance / 1000).toFixed(2);
      const min = Math.ceil(route.legs[0].duration / 60);
      setRouteInfo({ distance: km, duration: min });
      setRouteStatus("success");
    } catch {
      setRouteStatus("error");
    }
  }, [fromVal, toVal, bulanPlaces]);

  useEffect(() => {
    if (!showMapModal) return;
    if (!fromVal || !toVal) return;
    if (bulanPlaces.length === 0) return;

    const initTimer = setTimeout(() => {
      initOrResizeMap();
      const drawTimer = setTimeout(() => {
        routeDrawnRef.current = false;
        drawRoute();
      }, 300);
      return () => clearTimeout(drawTimer);
    }, 120);

    return () => clearTimeout(initTimer);
  }, [showMapModal, bulanPlaces, fromVal, toVal]);

  const handleSelectFrom = (name) => {
    setFromVal(name); setFromSearch(name);
    setFromOpen(false); setConfirmed(false); setValidationMsg("");
  };
  const handleSelectTo = (name) => {
    setToVal(name); setToSearch(name);
    setToOpen(false); setConfirmed(false); setValidationMsg("");
  };

  const handleDone = () => {
    if (!fromVal)          { setValidationMsg("⚠️ Pumili ng Pinagalingan (From)."); return; }
    if (!toVal)            { setValidationMsg("⚠️ Pumili ng Paroroonan (To)."); return; }
    if (fromVal === toVal) { setValidationMsg("⚠️ Hindi dapat pareho ang From at To."); return; }
    setValidationMsg("");
    setConfirmed(true);
  };

  const handleViewRoute = () => {
    routeDrawnRef.current = false;
    setRouteStatus("idle");
    setShowMapModal(true);
  };

  const handleCloseModal = () => {
    setShowMapModal(false);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      mapLoadedRef.current   = false;
    }
    if (typeof onClose === "function") onClose();
  };

  const themeClass = isDarkMode ? "rmc-dark" : "rmc-light";

  if (placesLoading && !hideForm) return (
    <div className={`rmc-wrapper ${themeClass}`}>
      <p className="rmc-section-label">⏳ Loading places from server...</p>
    </div>
  );

  if (placesError && !hideForm) return (
    <div className={`rmc-wrapper ${themeClass}`}>
      <p className="rmc-section-label" style={{ color: "red" }}>❌ {placesError}</p>
    </div>
  );

  return (
    <>
      {!hideForm && (
        <div className={`rmc-wrapper ${themeClass}`}>
          <div className="rmc-section-label">
            <span className="rmc-map-icon">🗺️</span>
            Tingnan ang Ruta sa Mapa
          </div>

          {/* FROM */}
          <div className="rmc-field">
            <label className="rmc-label">
              <span className="rmc-dot rmc-dot--green" /> Pinagalingan (From):
            </label>
            <div className="rmc-dropdown-wrap">
              <input
                className="rmc-input"
                value={fromSearch}
                placeholder="Maghanap ng lugar…"
                onChange={(e) => { setFromSearch(e.target.value); setFromOpen(true); setConfirmed(false); }}
                onFocus={() => setFromOpen(true)}
                onBlur={() => setTimeout(() => setFromOpen(false), 150)}
              />
              {fromOpen && filteredFrom.length > 0 && (
                <ul className="rmc-list">
                  {filteredFrom.slice(0, 10).map((p) => (
                    <li key={p.name} className="rmc-list-item" onMouseDown={() => handleSelectFrom(p.name)}>
                      <span className={`rmc-cat-badge rmc-cat--${p.category}`}>{p.category}</span>
                      {p.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* TO */}
          <div className="rmc-field">
            <label className="rmc-label">
              <span className="rmc-dot rmc-dot--red" /> Paroroonan (To):
            </label>
            <div className="rmc-dropdown-wrap">
              <input
                className="rmc-input"
                value={toSearch}
                placeholder="Maghanap ng lugar…"
                onChange={(e) => { setToSearch(e.target.value); setToOpen(true); setConfirmed(false); }}
                onFocus={() => setToOpen(true)}
                onBlur={() => setTimeout(() => setToOpen(false), 150)}
              />
              {toOpen && filteredTo.length > 0 && (
                <ul className="rmc-list">
                  {filteredTo.slice(0, 10).map((p) => (
                    <li key={p.name} className="rmc-list-item" onMouseDown={() => handleSelectTo(p.name)}>
                      <span className={`rmc-cat-badge rmc-cat--${p.category}`}>{p.category}</span>
                      {p.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {validationMsg && <p className="rmc-validation">{validationMsg}</p>}
          <button className="rmc-btn rmc-btn--done" onClick={handleDone}>✓ Done</button>
          {confirmed && (
            <button className="rmc-btn rmc-btn--route" onClick={handleViewRoute}>
              📍 View Route on Map
            </button>
          )}
        </div>
      )}

      {/* MAP MODAL */}
      {showMapModal && (
        <div className="rmc-overlay" onClick={(e) => { if (e.target === e.currentTarget) handleCloseModal(); }}>
          <div className="rmc-modal">
            <div className="rmc-modal-header">
              <div className="rmc-modal-route-label">
                <span className="rmc-dot rmc-dot--green" style={{ width: 10, height: 10 }} />
                <span className="rmc-modal-place">{fromVal}</span>
                <span className="rmc-arrow">→</span>
                <span className="rmc-dot rmc-dot--red" style={{ width: 10, height: 10 }} />
                <span className="rmc-modal-place">{toVal}</span>
              </div>
              {routeStatus === "success" && routeInfo && (
                <div className="rmc-chips">
                  <span className="rmc-chip">🚗 {routeInfo.distance} km</span>
                  <span className="rmc-chip">⏱ ~{routeInfo.duration} min</span>
                </div>
              )}
              <button className="rmc-close-btn" onClick={handleCloseModal}>✕</button>
            </div>

            {(routeStatus === "loading" || placesLoading) && (
              <div className="rmc-loading-overlay">
                <div className="rmc-spinner" />
                <span>{placesLoading ? "Loading places…" : "Kinakalkula ang ruta…"}</span>
              </div>
            )}

            {routeStatus === "error" && (
              <div className="rmc-loading-overlay">
                <span style={{ fontSize: "1.5rem" }}>⚠️</span>
                <span style={{ marginTop: 8 }}>Hindi makuha ang ruta. Subukan ulit.</span>
                <button
                  onClick={() => { routeDrawnRef.current = false; drawRoute(); }}
                  style={{ marginTop: 12, padding: "6px 18px", borderRadius: 8, cursor: "pointer", background: "#22c55e", color: "#000", border: "none", fontWeight: 700 }}
                >
                  Retry
                </button>
              </div>
            )}

            <div ref={mapContainerRef} className="rmc-map" />
          </div>
        </div>
      )}
    </>
  );
}
