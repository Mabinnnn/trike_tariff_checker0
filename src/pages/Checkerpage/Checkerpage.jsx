import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Checkerpage.css";
import { FaCheckCircle, FaMapMarkerAlt, FaEdit, FaSync, FaChevronDown } from "react-icons/fa";

import logoWhite from "../../assets/Logowhite-removebg-preview.png";
import logoBlack from "../../assets/Logoblack-removebg-preview.png";

import { getAllPlaces } from "../../api/api";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export const RIDE_TYPES = [
  { value: "sharing", label: " Sharing (Sabay-sakay)",    multiplier: 1.00, increasePercent:   0 },
  { value: "solo",    label: " Solo / Special (Mag-isa)", multiplier: 1.25, increasePercent:  25 },
  { value: "night",   label: " Night (Gabi)",             multiplier: 2.50, increasePercent: 150 },
];

const applyMultiplier = (baseFare, multiplier) =>
  baseFare != null ? Math.round(baseFare * multiplier) : null;
// ─────────────────────────────────────────────────────────────────────────────

export default function Checkerpage() {
  const navigate = useNavigate();

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("trikeTheme");
    return saved !== null ? saved === "dark" : true;
  });
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [places, setPlaces]         = useState([]);

  const [activeTier, setActiveTier] = useState(null);       // null = not yet loaded from server
  const [tierLoading, setTierLoading] = useState(true);     // true while fetching active tier

  const [originSaved, setOriginSaved]             = useState(false);
  const [destinationSaved, setDestinationSaved]   = useState(false);
  const [originButton, setOriginButton]           = useState("");
  const [destinationButton, setDestinationButton] = useState("");
  const [originInput, setOriginInput]             = useState("");
  const [destinationInput, setDestinationInput]   = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType]     = useState("");
  const [searchTerm, setSearchTerm]   = useState("");

  // ── Ride type selected by user ────────────────────────────────────────────
  const [rideType, setRideType] = useState("sharing");

  useEffect(() => {
    Promise.all([fetchPlaces(), fetchActiveTier()]);
  }, []);

  const fetchPlaces = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAllPlaces();
      setPlaces(data);
    } catch (err) {
      console.error("Error fetching places:", err);
      setError("Cannot connect to server. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveTier = async () => {
    setTierLoading(true);
    try {
      const res  = await fetch(`${BACKEND_URL}/api/admin/settings/active-tier`);
      const data = await res.json();
      if (data.status === "success" && data.activeTier) {
        setActiveTier(data.activeTier);
      } else {
        setActiveTier("50-59"); // safe fallback if server returns unexpected shape
      }
    } catch {
      setActiveTier("50-59"); // safe fallback on network error
    } finally {
      setTierLoading(false);
    }
  };

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    localStorage.setItem("trikeTheme", next ? "dark" : "light");
  };

  const filterPlaces = (value) =>
    places
      .map((p) => p.name)
      .filter((name) => name.toLowerCase().includes(value.toLowerCase()));
  
  const POBLACION_FLAT_FARE = 20;
    const isPoblacion = (place) =>
    place?.category?.toLowerCase() === "poblacion";

  // ── Helper: extract numeric km from a place document ─────────────────────
  // Prefers fares.distance_km (number), falls back to place.distance (may be string like "3.5 km")
  const getPlaceKm = (place) => {
    if (!place) return 0;
    if (place.fares?.distance_km != null) return parseFloat(place.fares.distance_km) || 0;
    if (place.distance != null) return parseFloat(place.distance) || 0;
    return 0;
  };

  // ── Fare lookup — base fare from route + multiplier applied ───────────────
  // Rule: when both places have fare data, use the one with the HIGHER km.
  // Example: From=14 km, To=3.5 km → use From's fare.
  const getFareForRoute = (origin, destination) => {
    const origPlace = places.find((p) => p.name === origin);
    const destPlace = places.find((p) => p.name === destination);

    // Flat ₱20 ONLY when BOTH ends are within Poblacion (intra-Poblacion short trip).
    // If one place is outside Poblacion (e.g. Lajong barangay), fall through to real DB fares.
    if (isPoblacion(destPlace) && isPoblacion(origPlace)) {
      const baseFare = POBLACION_FLAT_FARE;
      const tierKey  = activeTier ?? "50-59";
      return {
        activeTier: tierKey,
        baseFare,
        isPoblacionFlat: true,
        sharingFare: applyMultiplier(baseFare, 1.00),
        soloFare:    applyMultiplier(baseFare, 1.25),
        nightFare:   applyMultiplier(baseFare, 2.50),
        emergency_provisional_php: null,
        "50-59": baseFare, "60-69": baseFare, "70-79": baseFare,
        "80-89": baseFare, "90-99": baseFare,
        route:       "Poblacion",
        route_label: "Around Poblacion (Flat Rate)",
        distance_km: null,
        distance:    null,
      };
    }

    const origHasFares = !!(origPlace?.fares?.tiers);
    const destHasFares = !!(destPlace?.fares?.tiers);

    let farePlace = null;

    if (origHasFares && destHasFares) {
      // Both places have fare data — pick the one with the HIGHER km
      const origKm = getPlaceKm(origPlace);
      const destKm = getPlaceKm(destPlace);
      farePlace = origKm >= destKm ? origPlace : destPlace;
    } else if (origHasFares) {
      farePlace = origPlace;
    } else if (destHasFares) {
      farePlace = destPlace;
    }

    if (!farePlace) return null;

    const tiers    = farePlace.fares?.tiers ?? {};
    const tierKey  = activeTier ?? "50-59";       // activeTier is never null here (guarded by loading)
    const baseFare = tiers[tierKey] ?? null;

    return {
      activeTier: tierKey,
      baseFare,                                         // raw fare from DB

      // Pre-calculated for all ride types (useful on result page)
      sharingFare: applyMultiplier(baseFare, 1.00),
      soloFare:    applyMultiplier(baseFare, 1.25),
      nightFare:   applyMultiplier(baseFare, 2.50),

      emergency_provisional_php: farePlace.fares?.emergency_provisional_php ?? null,

      "50-59": tiers["50-59"] ?? null,
      "60-69": tiers["60-69"] ?? null,
      "70-79": tiers["70-79"] ?? null,
      "80-89": tiers["80-89"] ?? null,
      "90-99": tiers["90-99"] ?? null,

      route:       farePlace.fares?.route        ?? null,
      route_label: farePlace.fares?.route_label  ?? farePlace.fares?.fare_basis ?? null,
      distance_km: farePlace.fares?.distance_km  ?? null,
      distance:    farePlace.distance            ?? null,
    };
  };

  const handleCalculate = () => {
    const finalOrigin      = originSaved      ? originButton      : originInput;
    const finalDestination = destinationSaved ? destinationButton : destinationInput;

    if (!finalOrigin || !finalDestination) {
      alert("Mangyaring ilagay ang pinagalingan at paroroonan.");
      return;
    }

    const validPlaceNames = places.map((p) => p.name);
    if (!validPlaceNames.includes(finalOrigin)) {
      alert(`"${finalOrigin}" ay hindi kilalang lugar.\nMangyaring pumili mula sa listahan (Pumili button).`);
      return;
    }
    if (!validPlaceNames.includes(finalDestination)) {
      alert(`"${finalDestination}" ay hindi kilalang lugar.\nMangyaring pumili mula sa listahan (Pumili button).`);
      return;
    }

    if (finalOrigin === finalDestination) {
      alert("Hindi maaaring pareho ang Pinagalingan at Paroroonan.\nMangyaring pumili ng ibang lugar.");
      return;
    }

    const routeData    = getFareForRoute(finalOrigin, finalDestination);
    const selectedRide = RIDE_TYPES.find((r) => r.value === rideType);

    const baseFare = routeData?.baseFare ?? null;
    const effectiveMultiplier =
      routeData?.isPoblacionFlat && rideType !== "night" ? 1.00 : selectedRide.multiplier;

    const finalFare    = applyMultiplier(baseFare, effectiveMultiplier);
    const fareIncrease = (baseFare != null && finalFare != null)
      ? finalFare - baseFare
      : null;

    const fareInfo = {
      ...routeData,
      // Ride-type fields
      rideType,
      rideLabel:       selectedRide.label,
      multiplier:      selectedRide.multiplier,
      increasePercent: selectedRide.increasePercent,
      // Final computed fare (primary amount shown on result page)
      finalFare,
      fareIncrease,
    };

    navigate("/result", {
      state: { origin: finalOrigin, destination: finalDestination, fareInfo },
    });
  };

  const openModal  = (type) => { setModalType(type); setSearchTerm(""); setIsModalOpen(true); };
  const closeModal = () => setIsModalOpen(false);

  const handleSetLocation = (loc) => {
    if (modalType === "origin") { setOriginButton(loc); setOriginSaved(true); }
    else { setDestinationButton(loc); setDestinationSaved(true); }
    closeModal();
  };

  const handleOriginKeyDown = (e) => {
    if (e.key === "Enter" && originInput) { setOriginButton(originInput); setOriginSaved(true); }
  };
  const handleDestinationKeyDown = (e) => {
    if (e.key === "Enter" && destinationInput) { setDestinationButton(destinationInput); setDestinationSaved(true); }
  };

  const filteredModalPlaces = filterPlaces(searchTerm);
  const selectedRide = RIDE_TYPES.find((r) => r.value === rideType);

  if (loading || tierLoading) {
    return (
      <div className={`tariff-page ${isDarkMode ? "dark-mode" : "light-mode"}`}>
        <div className="loading-container">
          <FaSync className="spin" />
          <p>Loading places...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`tariff-page ${isDarkMode ? "dark-mode" : "light-mode"}`}>
        <div className="loading-container">
          <p style={{ color: "red" }}>{error}</p>
          <button onClick={fetchPlaces} style={{ marginTop: "12px", padding: "8px 20px", cursor: "pointer" }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`tariff-page ${isDarkMode ? "dark-mode" : "light-mode"}`}>
      <div className="tariff-container">

        {/* Header */}
        <div className="header-row">
          <div className="sun-icon-btn" onClick={toggleTheme}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill={isDarkMode ? "white" : "black"} viewBox="0 0 16 16">
              <path d="M12 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0M8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0m0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13m8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5M3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8m10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0m-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0m9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707M4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708" />
            </svg>
          </div>
          <div className="logo-wrapper">
            <img src={isDarkMode ? logoWhite : logoBlack} alt="Logo" className="brand-logo" />
          </div>
          <h1 className="title-text">TrikeTariffChecker</h1>
          <p className="subtitle-text">Hindi ka maloloko sa presyo</p>
          <div className="dashed-line"></div>
        </div>

        {/* Green body panel */}
        <div className="form-body">

          {/* ── Ride Type Dropdown ─────────────────────────────────────────── */}
          <div className="location-section" style={{ minHeight: "120px", flexShrink: 0 }}>
            <label className="field-label">
              Uri ng Biyahe (Ride Type):
            </label>
            <div className="ride-select-wrapper">
              <select
                className="ride-select"
                value={rideType}
                onChange={(e) => setRideType(e.target.value)}
              >
                {RIDE_TYPES.map((rt) => (
                  <option key={rt.value} value={rt.value}>
                    {rt.label}{rt.increasePercent > 0 ? `  (+${rt.increasePercent}%)` : "  (base fare)"}
                  </option>
                ))}
              </select>
              <FaChevronDown className="ride-select-arrow" />
            </div>
            {/* Live surcharge badge */}
            <div className={`ride-badge ride-badge--${rideType}`}>
              <span className="ride-badge__label">{selectedRide.label}</span>
              <span className="ride-badge__pill">
                {selectedRide.increasePercent === 0
                  ? "Base fare — walang dagdag"
                  : `+${selectedRide.increasePercent}% surcharge`}
              </span>
            </div>
          </div>

          {/* Origin */}
          <div className="location-section">
            <label className="field-label"><FaMapMarkerAlt /> Pinagalingan (From):</label>
            {originSaved ? (
              <div className="saved-location-row">
                <div className="saved-location-box">
                  <FaCheckCircle className="check-icon" />
                  <span>{originButton}</span>
                </div>
                <button className="edit-location-btn" onClick={() => { setOriginSaved(false); setOriginButton(""); setOriginInput(""); }}>
                  <FaEdit />
                </button>
              </div>
            ) : (
              <div className="input-row">
                <input
                  type="text"
                  className="location-input"
                  placeholder="I-type ang pinagalingan..."
                  value={originInput}
                  onChange={(e) => setOriginInput(e.target.value)}
                  onKeyDown={handleOriginKeyDown}
                />
                <button className="pick-btn" onClick={() => openModal("origin")}>Pumili</button>
              </div>
            )}
          </div>

          {/* Destination */}
          <div className="location-section">
            <label className="field-label"><FaMapMarkerAlt /> Paroroonan (To):</label>
            {destinationSaved ? (
              <div className="saved-location-row">
                <div className="saved-location-box">
                  <FaCheckCircle className="check-icon" />
                  <span>{destinationButton}</span>
                </div>
                <button className="edit-location-btn" onClick={() => { setDestinationSaved(false); setDestinationButton(""); setDestinationInput(""); }}>
                  <FaEdit />
                </button>
              </div>
            ) : (
              <div className="input-row">
                <input
                  type="text"
                  className="location-input"
                  placeholder="I-type ang paroroonan..."
                  value={destinationInput}
                  onChange={(e) => setDestinationInput(e.target.value)}
                  onKeyDown={handleDestinationKeyDown}
                />
                <button className="pick-btn" onClick={() => openModal("destination")}>Pumili</button>
              </div>
            )}
          </div>

          {/* Calculate Button */}
          <button className="calculate-btn" onClick={handleCalculate}>
            Kalkulahin ang Pamasahe
          </button>

        </div>
      </div>

      {/* Pumili Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className={`modal-box ${isDarkMode ? "modal-dark" : "modal-light"}`} onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-header-row">
              <div className="modal-type-badge">
                <FaMapMarkerAlt />
                <span>{modalType === "origin" ? "Pinagalingan" : "Paroroonan"}</span>
              </div>
              <button className="modal-x-btn" onClick={closeModal}>✕</button>
            </div>
            <h3 className="modal-title">
              {modalType === "origin" ? "Saan ka galing?" : "Saan ka pupunta?"}
            </h3>
            <div className="modal-search-wrapper">
              <FaMapMarkerAlt className="modal-search-icon" />
              <input
                type="text"
                className="modal-search"
                placeholder="Maghanap ng lugar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
              {searchTerm && (
                <button className="modal-search-clear" onClick={() => setSearchTerm("")}>✕</button>
              )}
            </div>
            {searchTerm && (
              <p className="modal-result-count">{filteredModalPlaces.length} lugar ang nahanap</p>
            )}
            <div className="modal-list">
              {filteredModalPlaces.length === 0 ? (
                <div className="modal-empty-state">
                  <span className="modal-empty-icon">🔍</span>
                  <p>Walang nahanap na lugar</p>
                  <span>Subukang ibang salita</span>
                </div>
              ) : (
                filteredModalPlaces.map((place) => (
                  <button key={place} className="modal-item" onClick={() => handleSetLocation(place)}>
                    <span className="modal-item-icon"><FaMapMarkerAlt /></span>
                    <span className="modal-item-name">{place}</span>
                    <span className="modal-item-arrow">›</span>
                  </button>
                ))
              )}
            </div>
            <button className="modal-close-btn" onClick={closeModal}>Isara</button>
          </div>
        </div>
      )}
    </div>
  );
}
