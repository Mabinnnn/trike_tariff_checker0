import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Checkerpage.css";
import { FaCheckCircle, FaMapMarkerAlt, FaEdit, FaSync, FaChevronDown, FaCrosshairs } from "react-icons/fa";

import logoWhite from "../../assets/Logowhite-removebg-preview.png";
import logoBlack from "../../assets/Logoblack-removebg-preview.png";

import { getAllPlaces } from "../../api/api";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export const PASSENGER_TYPES = [
  { value: "regular", label: "Regular",          multiplier: 1.00, discountPercent:  0 },
  { value: "student", label: "Student (Estudyante)", multiplier: 0.80, discountPercent: 20 },
  { value: "pwd",     label: "PWD",              multiplier: 0.80, discountPercent: 20 },
  { value: "senior",  label: "Senior Citizen",   multiplier: 0.80, discountPercent: 20 },
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

  // ── Autocomplete state ────────────────────────────────────────────────────
  const [originSuggestions, setOriginSuggestions]           = useState([]);
  const [originActiveIndex, setOriginActiveIndex]           = useState(-1);
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);
  const [destinationActiveIndex, setDestinationActiveIndex] = useState(-1);

  const originRef      = useRef(null);
  const destinationRef = useRef(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (originRef.current && !originRef.current.contains(e.target)) {
        setOriginSuggestions([]);
        setOriginActiveIndex(-1);
      }
      if (destinationRef.current && !destinationRef.current.contains(e.target)) {
        setDestinationSuggestions([]);
        setDestinationActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType]     = useState("");
  const [searchTerm, setSearchTerm]   = useState("");

  // ── Passenger type selected by user ──────────────────────────────────────
  const [passengerType, setPassengerType] = useState("regular");

  // ── Geolocation state ─────────────────────────────────────────────────────
  const [locating,   setLocating]   = useState(false);
  const [locError,   setLocError]   = useState("");

  // ── Too-close places message ──────────────────────────────────────────────
  const [nearbyMsg,  setNearbyMsg]  = useState("");

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

  const filterPlaces = (value) => {
    if (!value || value.trim().length < 2) return [];
    const lower = value.trim().toLowerCase();
    return places
      .map((p) => p.name)
      .filter((name) => name.toLowerCase().includes(lower));
  };
  
  const SHORT_TRIP_FLAT_FARE = 20;  // ₱20 for trips 0.0-2.0 km
  const SHORT_TRIP_MAX_KM = 2.0;    // Maximum distance for flat fare

  // Extract coordinates from a place document
  const getCoords = (place) => {
    if (!place?.coords) return null;
    if (Array.isArray(place.coords)) return place.coords;
    if (place.coords.coordinates && Array.isArray(place.coords.coordinates)) {
      return place.coords.coordinates;
    }
    return null;
  };

  // Calculate distance in km between two coordinate pairs using Haversine formula
  const getDistanceKmFromCoords = (from, to) => {
    if (!from || !to || from.length < 2 || to.length < 2) return null;
    const [lng1, lat1] = from;
    const [lng2, lat2] = to;
    const toRad = (deg) => (deg * Math.PI) / 180;
    const R = 6371; // Earth radius in kilometers
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

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

    // ── Check distance between places for short trip flat fare ───────────────
    // IMPORTANT: Use the stored fares.distance_km (actual road distance from admin/MongoDB)
    // as the primary distance check. Only fall back to Haversine straight-line distance
    // when neither place has a stored route distance.
    // This prevents misclassifying long road routes as "short trips" just because
    // two places are geographically close but far apart by road.
    const origKm = getPlaceKm(origPlace);
    const destKm = getPlaceKm(destPlace);
    const maxStoredKm = Math.max(origKm, destKm);

    const coordsA = getCoords(origPlace);
    const coordsB = getCoords(destPlace);
    const geoDistance = getDistanceKmFromCoords(coordsA, coordsB);

    // Use stored road distance if available (more accurate); else fall back to Haversine
    const effectiveDistance = maxStoredKm > 0 ? maxStoredKm : geoDistance;

    if (effectiveDistance != null && effectiveDistance > 0.1 && effectiveDistance <= SHORT_TRIP_MAX_KM) {
      const baseFare = SHORT_TRIP_FLAT_FARE;
      const tierKey = activeTier ?? "50-59";
      return {
        activeTier: tierKey,
        baseFare,
        isShortTripFlat: true,
        emergency_provisional_php: null,
        "50-59": baseFare, "60-69": baseFare, "70-79": baseFare,
        "80-89": baseFare, "90-99": baseFare,
        route: "Short Trip",
        route_label: `Short Trip ≤ ${SHORT_TRIP_MAX_KM} km (Flat Rate ₱${SHORT_TRIP_FLAT_FARE})`,
        distance_km: parseFloat(effectiveDistance.toFixed(2)),
        distance: `${effectiveDistance.toFixed(1)} km`,
      };
    }
    // Distance > 2.0 km → use original database fare below

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

  // ── Get nearest place from user's GPS location ───────────────────────────
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocError("Hindi sinusuportahan ng iyong browser ang geolocation.");
      return;
    }

    setLocating(true);
    setLocError("");

    const ACCURACY_THRESHOLD_M = 50; // accept fix only when ≤ 50 m accurate
    const MAX_WAIT_MS          = 15000; // give up after 15 s
    let watchId                = null;
    let settled                = false;

    const finish = (position) => {
      if (settled) return;
      settled = true;
      navigator.geolocation.clearWatch(watchId);

      const { latitude, longitude } = position.coords;
      const userCoords = [longitude, latitude]; // [lng, lat] — matches DB format

      // Find the closest place using Haversine distance
      let nearest = null;
      let minDist = Infinity;

      places.forEach((place) => {
        const placeCoords = getCoords(place);
        if (!placeCoords) return;
        const dist = getDistanceKmFromCoords(userCoords, placeCoords);
        if (dist !== null && dist < minDist) {
          minDist = dist;
          nearest = place;
        }
      });

      if (nearest) {
        setOriginInput(nearest.name);
        setOriginButton(nearest.name);
        setOriginSaved(true);
        setOriginSuggestions([]);
        setLocError("");
      } else {
        setLocError("Walang lugar na nahanap malapit sa iyo.");
      }

      setLocating(false);
    };

    const onError = (err) => {
      if (settled) return;
      settled = true;
      navigator.geolocation.clearWatch(watchId);
      setLocating(false);
      if (err.code === 1) {
        setLocError("⚠️ Hindi pinahintulutan ang lokasyon. I-allow ang location permission sa browser.");
      } else if (err.code === 2) {
        setLocError("⚠️ Hindi ma-detect ang iyong lokasyon. Siguraduhing naka-on ang GPS.");
      } else {
        setLocError("⚠️ Nag-timeout. Subukang muli.");
      }
    };

    // watchPosition keeps refining the fix; we accept the first reading
    // that is accurate enough, then immediately stop watching.
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (position.coords.accuracy <= ACCURACY_THRESHOLD_M) {
          finish(position);
        }
        // else: keep waiting for a more accurate fix
      },
      onError,
      { enableHighAccuracy: true, timeout: MAX_WAIT_MS, maximumAge: 0 }
    );

    // Safety net: if we never get a good-enough fix within MAX_WAIT_MS,
    // use the best reading we have via a one-shot fallback call.
    setTimeout(() => {
      if (!settled) {
        navigator.geolocation.clearWatch(watchId);
        navigator.geolocation.getCurrentPosition(
          finish,
          onError,
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      }
    }, MAX_WAIT_MS);
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

    // ── Too-close check: 1 m – 5 m apart ─────────────────────────────────
    const origPlace = places.find((p) => p.name === finalOrigin);
    const destPlace = places.find((p) => p.name === finalDestination);
    const coordsA   = getCoords(origPlace);
    const coordsB   = getCoords(destPlace);
    const geoDist   = getDistanceKmFromCoords(coordsA, coordsB);   // km

    if (geoDist !== null && geoDist >= 0.001 && geoDist <= 0.1) {
      setNearbyMsg("These places are just across from each other.");
      return;
    }

    setNearbyMsg(""); // clear if previously shown

    const routeData       = getFareForRoute(finalOrigin, finalDestination);
    const selectedPassenger = PASSENGER_TYPES.find((p) => p.value === passengerType);

    const baseFare = routeData?.baseFare ?? null;
    const effectiveMultiplier =
      routeData?.isShortTripFlat ? 1.00 : selectedPassenger.multiplier;

    const finalFare    = applyMultiplier(baseFare, effectiveMultiplier);
    const fareDecrease = (baseFare != null && finalFare != null)
      ? baseFare - finalFare
      : null;

    const fareInfo = {
      ...routeData,
      // Passenger-type fields
      rideType:        passengerType,
      rideLabel:       selectedPassenger.label,
      multiplier:      selectedPassenger.multiplier,
      discountPercent: selectedPassenger.discountPercent,
      // Final computed fare (primary amount shown on result page)
      finalFare,
      fareIncrease: -fareDecrease,   // kept for result-page compat (negative = discount)
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

  const selectSuggestion = (type, name) => {
    if (type === "origin") {
      setOriginInput(name);
      setOriginButton(name);
      setOriginSaved(true);
      setOriginSuggestions([]);
      setOriginActiveIndex(-1);
    } else {
      setDestinationInput(name);
      setDestinationButton(name);
      setDestinationSaved(true);
      setDestinationSuggestions([]);
      setDestinationActiveIndex(-1);
    }
  };

  const handleOriginKeyDown = (e) => {
    if (originSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setOriginActiveIndex((i) => Math.min(i + 1, originSuggestions.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setOriginActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const chosen = originActiveIndex >= 0 ? originSuggestions[originActiveIndex] : originSuggestions[0];
        selectSuggestion("origin", chosen);
      } else if (e.key === "Escape") {
        setOriginSuggestions([]);
        setOriginActiveIndex(-1);
      }
    } else if (e.key === "Enter" && originInput) {
      const match = filterPlaces(originInput);
      if (match.length > 0) selectSuggestion("origin", match[0]);
    }
  };
  const handleDestinationKeyDown = (e) => {
    if (destinationSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setDestinationActiveIndex((i) => Math.min(i + 1, destinationSuggestions.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setDestinationActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const chosen = destinationActiveIndex >= 0 ? destinationSuggestions[destinationActiveIndex] : destinationSuggestions[0];
        selectSuggestion("destination", chosen);
      } else if (e.key === "Escape") {
        setDestinationSuggestions([]);
        setDestinationActiveIndex(-1);
      }
    } else if (e.key === "Enter" && destinationInput) {
      const match = filterPlaces(destinationInput);
      if (match.length > 0) selectSuggestion("destination", match[0]);
    }
  };

  const filteredModalPlaces = searchTerm.trim()
    ? places.map((p) => p.name).filter((name) => name.toLowerCase().includes(searchTerm.trim().toLowerCase()))
    : places.map((p) => p.name);
  const selectedPassenger = PASSENGER_TYPES.find((p) => p.value === passengerType);

  if (loading || tierLoading) {
    return (
      <div className={`tariff-page ${isDarkMode ? "dark-mode" : "light-mode"}`}>
        <div className="loading-screen">

          {/* Logo + theme toggle side by side */}
          <div className="loading-logo-row">
            <div className="loading-logo-wrap">
              <img src={isDarkMode ? logoWhite : logoBlack} alt="Trike Logo" className="loading-logo" />
            </div>
            <button className="loading-theme-btn" onClick={toggleTheme} title="Toggle theme">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill={isDarkMode ? "white" : "#333"} viewBox="0 0 16 16">
                <path d="M12 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0M8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0m0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13m8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5M3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8m10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0m-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0m9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707M4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708" />
              </svg>
            </button>
          </div>

          <h1 className="loading-title">TrikeTariffChecker</h1>
          <div className="loading-bar">
            <span /><span /><span /><span /><span />
          </div>
          <div className="loading-spinner-row">
            <FaSync className="loading-spin-icon" />
            <span className="loading-label">Kinukuha ang mga lugar…</span>
          </div>
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

          {/* ── Passenger Type ────────────────────────────────────────────── */}
          <div className="location-section" style={{ minHeight: "120px", flexShrink: 0 }}>
            <label className="field-label">
              Uri ng Pasahero (Passenger Type):
            </label>
            <div className="ride-select-wrapper">
              <select
                className="ride-select"
                value={passengerType}
                onChange={(e) => setPassengerType(e.target.value)}
              >
                {PASSENGER_TYPES.map((pt) => (
                  <option key={pt.value} value={pt.value}>
                    {pt.label}{pt.discountPercent > 0 ? `  (−${pt.discountPercent}% discount)` : "  (base fare)"}
                  </option>
                ))}
              </select>
              <FaChevronDown className="ride-select-arrow" />
            </div>
            {/* Live discount badge */}
            <div className={`ride-badge ride-badge--${passengerType}`}>
              <span className="ride-badge__label">{selectedPassenger.label}</span>
              <span className="ride-badge__pill">
                {selectedPassenger.discountPercent === 0
                  ? "Base fare — walang diskwento"
                  : `−${selectedPassenger.discountPercent}% diskwento`}
              </span>
            </div>
          </div>

          {/* Origin */}
          <div className="location-section" ref={originRef}>
            <label className="field-label"><FaMapMarkerAlt /> Pinagalingan (From):</label>
            {originSaved ? (
              <div className="saved-location-row">
                <div className="saved-location-box">
                  <FaCheckCircle className="check-icon" />
                  <span>{originButton}</span>
                </div>
                <button className="edit-location-btn" onClick={() => { setOriginSaved(false); setOriginButton(""); setOriginInput(""); setOriginSuggestions([]); }}>
                  <FaEdit />
                </button>
              </div>
            ) : (
              <div className="autocomplete-wrapper">
                <div className="input-row">
                  <input
                    type="text"
                    className="location-input"
                    placeholder="I-type ang pinagalingan..."
                    value={originInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setOriginInput(val);
                      const suggestions = val.trim() ? filterPlaces(val) : [];
                      setOriginSuggestions(suggestions);
                      setOriginActiveIndex(suggestions.length > 0 ? 0 : -1);
                    }}
                    onKeyDown={handleOriginKeyDown}
                    autoComplete="off"
                  />
                  <button className="pick-btn" onClick={() => openModal("origin")}>Pumili</button>
                </div>

                {/* ── GPS locate button ─────────────────────────────────── */}
                <button
                  className={`locate-btn${locating ? " locate-btn--loading" : ""}`}
                  onClick={handleGetLocation}
                  disabled={locating}
                  title="Gamitin ang aking kasalukuyang lokasyon"
                >
                  {locating
                    ? <FaSync className="locate-spin" />
                    : <FaCrosshairs className="locate-icon" />}
                  <span>{locating ? "Hinahanap ang iyong lokasyon…" : "Gamitin ang aking lokasyon"}</span>
                </button>

                {locError && (
                  <p className="locate-error">{locError}</p>
                )}

                {originSuggestions.length > 0 && (
                  <ul className="autocomplete-dropdown">
                    {originSuggestions.map((name, i) => (
                      <li
                        key={name}
                        className={`autocomplete-item${i === originActiveIndex ? " autocomplete-item--active" : ""}`}
                        onMouseDown={() => selectSuggestion("origin", name)}
                        onMouseEnter={() => setOriginActiveIndex(i)}
                      >
                        <FaMapMarkerAlt className="autocomplete-pin" />
                        <span>{name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Destination */}
          <div className="location-section" ref={destinationRef}>
            <label className="field-label"><FaMapMarkerAlt /> Paroroonan (To):</label>
            {destinationSaved ? (
              <div className="saved-location-row">
                <div className="saved-location-box">
                  <FaCheckCircle className="check-icon" />
                  <span>{destinationButton}</span>
                </div>
                <button className="edit-location-btn" onClick={() => { setDestinationSaved(false); setDestinationButton(""); setDestinationInput(""); setDestinationSuggestions([]); }}>
                  <FaEdit />
                </button>
              </div>
            ) : (
              <div className="autocomplete-wrapper">
                <div className="input-row">
                  <input
                    type="text"
                    className="location-input"
                    placeholder="I-type ang paroroonan..."
                    value={destinationInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDestinationInput(val);
                      const suggestions = val.trim() ? filterPlaces(val) : [];
                      setDestinationSuggestions(suggestions);
                      setDestinationActiveIndex(suggestions.length > 0 ? 0 : -1);
                    }}
                    onKeyDown={handleDestinationKeyDown}
                    autoComplete="off"
                  />
                  <button className="pick-btn" onClick={() => openModal("destination")}>Pumili</button>
                </div>
                {destinationSuggestions.length > 0 && (
                  <ul className="autocomplete-dropdown autocomplete-dropdown--up">
                    {destinationSuggestions.map((name, i) => (
                      <li
                        key={name}
                        className={`autocomplete-item${i === destinationActiveIndex ? " autocomplete-item--active" : ""}`}
                        onMouseDown={() => selectSuggestion("destination", name)}
                        onMouseEnter={() => setDestinationActiveIndex(i)}
                      >
                        <FaMapMarkerAlt className="autocomplete-pin" />
                        <span>{name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Calculate Button */}
          {nearbyMsg && (
            <div className="nearby-msg">
              <span className="nearby-msg__icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5m.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2"/>
                </svg>
              </span>
              <span>{nearbyMsg}</span>
            </div>
          )}
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
