import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Resultpage.css";
import { FaCheckCircle } from "react-icons/fa";
import RouteMapChecker from "../../components/RouteMapChecker/RouteMapChecker";
import { calculateFare } from "../../api/api";

import logoWhite from "../../assets/Logowhite-removebg-preview.png";
import logoBlack from "../../assets/Logoblack-removebg-preview.png";

const TIER_LABELS = {
  "50-59": "Gasoline ₱50–59",
  "60-69": "Gasoline ₱60–69",
  "70-79": "Gasoline ₱70–79",
  "80-89": "Gasoline ₱80–89",
  "90-99": "Gasoline ₱90–99",
};

export default function Resultpage() {
  const [isDarkMode,   setIsDarkMode]   = useState(() => {
    const saved = localStorage.getItem("trikeTheme");
    return saved !== null ? saved === "dark" : true;
  });
  const [showRouteMap, setShowRouteMap] = useState(false);
  const [resultLoading, setResultLoading] = useState(false);
  const [resultError, setResultError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const queryOrigin = searchParams.get("origin");
  const queryDestination = searchParams.get("destination");

  const initialState = location.state || {};
  const [resultData, setResultData] = useState({
    origin:      initialState.origin || queryOrigin || "N/A",
    destination: initialState.destination || queryDestination || "N/A",
    fareInfo:    initialState.fareInfo || null,
  });

  const { origin, destination, fareInfo } = resultData;

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    localStorage.setItem("trikeTheme", next ? "dark" : "light");
  };
  const handleDone  = () => navigate("/");

  // ── Fare values ────────────────────────────────────────────────────────────

  return (
    <div className={`result-page ${isDarkMode ? "dark-mode" : "light-mode"}`}>
      {/* Hide the Leaflet compass / bearing-reset button */}
      <style>{`
        .leaflet-control-zoom-reset,
        .leaflet-bearing-reset,
        .leaflet-control-rotate,
        .leaflet-control-zoom a[title="Reset bearing to north"] { display: none !important; }
      `}</style>
      <div className="container">

        {/* ── Header ── */}
        <div className="header-section">
          <div className="sun-icon-btn" onClick={toggleTheme} title="Toggle theme">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22"
              fill={isDarkMode ? "white" : "black"} viewBox="0 0 16 16">
              <path d="M12 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0M8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0m0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13m8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5M3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8m10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0m-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0m9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707M4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708" />
            </svg>
          </div>
          <div className="logo-wrapper">
            <img src={isDarkMode ? logoWhite : logoBlack} alt="Trike Logo" className="brand-logo" />
          </div>
          <h1 className="title-text">TrikeTariffChecker</h1>
          <p className="subtitle-text">Hindi ka maloloko sa presyo</p>
          <div className="dashed-line" />
        </div>

        {/* ── Result Card ── */}
        <div className="result-card-container">

          {/* Top grey — origin / destination */}
          <div className="top-grey-area">
            <div className="location-item">
              <label>Pinagalingan (From:)</label>
              <div className="location-result-text">{origin}</div>
            </div>
            <div className="location-item">
              <label>Paroroonan (To:)</label>
              <div className="location-result-text">{destination}</div>
            </div>
          </div>

          {/* Bottom green — fare */}
          <div className="bottom-green-area">
            <div className="calc-status">
              <FaCheckCircle className="check-svg" />
              <span>Tricycle Fare</span>
            </div>

            {/* Passenger type pill — uses .result-ride-label */}
            {fareInfo?.rideLabel && (
              <div className="result-ride-label">
                {fareInfo.rideLabel}
                {fareInfo.discountPercent > 0 && ` · −${fareInfo.discountPercent}% discount`}
              </div>
            )}

            {/* Big fare amount */}
            <div className={`fare-display-box${!fareInfo?.finalFare ? " no-fare" : ""}`}>
              {resultLoading ? (
                <span>Naglo-load ng resulta…</span>
              ) : resultError ? (
                <span>{resultError}</span>
              ) : fareInfo?.finalFare != null ? (
                <span>₱{fareInfo.finalFare}</span>
              ) : (
                <span>Walang datos</span>
              )}
            </div>

            <div className="button-group">
              <button
                className="btn-view-route"
                onClick={() => setShowRouteMap(true)}
              >
                📍 View Route on Map
              </button>
              <button className="btn-white" onClick={handleDone}>
                Done
              </button>
            </div>
          </div>
        </div>

        {showRouteMap && (
          <RouteMapChecker
            key={`${origin}-${destination}`}
            isDarkMode={isDarkMode}
            prefilledFrom={origin}
            prefilledTo={destination}
            autoOpen={true}
            hideForm={true}
            onClose={() => setShowRouteMap(false)}
          />
        )}

      </div>
    </div>
  );
}
