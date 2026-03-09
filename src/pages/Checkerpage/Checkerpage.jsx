import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Checkerpage.css";
import { FaCheckCircle, FaMapMarkerAlt, FaEdit, FaSync } from "react-icons/fa";

import logoWhite from "../../assets/Logowhite-removebg-preview.png";
import logoBlack from "../../assets/Logoblack-removebg-preview.png";

import { getRoutes } from "../../api/api";

export default function Checkerpage() {
  const navigate = useNavigate();

  const [isDarkMode, setIsDarkMode] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [routes, setRoutes] = useState([]);
  const [todaList, setTodaList] = useState([]);
  const [locationList, setLocationList] = useState([]);

  const [originSaved, setOriginSaved] = useState(false);
  const [destinationSaved, setDestinationSaved] = useState(false);
  const [originButton, setOriginButton] = useState("");
  const [destinationButton, setDestinationButton] = useState("");

  const [originInput, setOriginInput] = useState("");
  const [destinationInput, setDestinationInput] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState("");
  const [editType, setEditType] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedToda, setSelectedToda] = useState("");

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    setLoading(true);
    setError("");
    try {
      const routeData = await getRoutes();
      setRoutes(routeData);
      const todas = [...new Set(routeData.map((r) => r.toda_name))];
      setTodaList(todas);
      const locations = [...new Set(routeData.map((r) => r.location))];
      setLocationList(locations);
    } catch (err) {
      console.error("Error fetching routes:", err);
      setError("Cannot connect to server. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const getLocationsForToda = (todaName) => {
    if (!todaName) return locationList;
    return routes.filter((r) => r.toda_name === todaName).map((r) => r.location);
  };

  const getFareForRoute = (todaName, origin, destination) => {
    const originRoute = routes.find((r) => r.toda_name === todaName && r.location === origin);
    const destRoute = routes.find((r) => r.toda_name === todaName && r.location === destination);

    if (originRoute && destRoute) {
      const minFare = Math.min(originRoute.student_fare_min, destRoute.student_fare_min);
      const maxFare = Math.max(originRoute.student_fare_max, destRoute.student_fare_max);
      return { routeNo: destRoute.route_no, minFare, maxFare };
    }
    if (destRoute) return { routeNo: destRoute.route_no, minFare: destRoute.student_fare_min, maxFare: destRoute.student_fare_max };
    if (originRoute) return { routeNo: originRoute.route_no, minFare: originRoute.student_fare_min, maxFare: originRoute.student_fare_max };
    return null;
  };

  const handleCalculate = () => {
    const finalOrigin = originSaved ? originButton : originInput;
    const finalDestination = destinationSaved ? destinationButton : destinationInput;

    if (!finalOrigin || !finalDestination) {
      alert("Mangyaring ilagay ang pinagalingan at paroroonan.");
      return;
    }

    const fareInfo = getFareForRoute(selectedToda, finalOrigin, finalDestination);

    navigate("/result", {
      state: {
        origin: finalOrigin,
        destination: finalDestination,
        selectedToda: selectedToda,
        routeNo: fareInfo ? fareInfo.routeNo : null,
        fareMin: fareInfo ? fareInfo.minFare : null,
        fareMax: fareInfo ? fareInfo.maxFare : null,
      },
    });
  };

  const filterPlaces = (value, type) => {
    if (type === "origin") {
      if (!selectedToda) return [];
      return getLocationsForToda(selectedToda).filter((p) =>
        p.toLowerCase().includes(value.toLowerCase())
      );
    }
    return locationList.filter((p) => p.toLowerCase().includes(value.toLowerCase()));
  };

  const openModal = (type) => {
    setModalType(type);
    setEditType("");
    setSearchTerm("");
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleSetLocation = (loc) => {
    const isOrigin =
      modalType === "origin" || (modalType === "edit" && editType === "origin");
    if (isOrigin) {
      setOriginButton(loc);
      setOriginSaved(true);
    } else {
      setDestinationButton(loc);
      setDestinationSaved(true);
    }
    closeModal();
  };

  const handleOriginKeyDown = (e) => {
    if (e.key === "Enter" && originInput) {
      setOriginButton(originInput);
      setOriginSaved(true);
    }
  };

  const handleDestinationKeyDown = (e) => {
    if (e.key === "Enter" && destinationInput) {
      setDestinationButton(destinationInput);
      setDestinationSaved(true);
    }
  };

  const isOriginModal =
    modalType === "origin" || (modalType === "edit" && editType === "origin");
  const filteredModalPlaces = filterPlaces(searchTerm, isOriginModal ? "origin" : "destination");

  if (loading) {
    return (
      <div className={`tariff-page ${isDarkMode ? "dark-mode" : "light-mode"}`}>
        <div className="loading-container">
          <FaSync className="spin" />
          <p>Loading routes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`tariff-page ${isDarkMode ? "dark-mode" : "light-mode"}`}>
        <div className="loading-container">
          <p style={{ color: "red" }}>{error}</p>
          <button onClick={fetchRoutes} style={{ marginTop: "12px", padding: "8px 20px", cursor: "pointer" }}>
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

        {/* TODA Selector */}
        <div className="toda-section">
          <label className="field-label">Piliin ang TODA:</label>
          <select
            className="toda-select"
            value={selectedToda}
            onChange={(e) => {
              setSelectedToda(e.target.value);
              setOriginSaved(false);
              setOriginButton("");
              setOriginInput("");
              setDestinationSaved(false);
              setDestinationButton("");
              setDestinationInput("");
            }}
          >
            <option value="">-- Pumili ng TODA --</option>
            {todaList.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Origin */}
        <div className="location-section">
          <label className="field-label">
            <FaMapMarkerAlt /> Pinagalingan (From):
          </label>
          {originSaved ? (
            <div className="saved-location-row">
              <div className="saved-location-box">
                <FaCheckCircle className="check-icon" />
                <span>{originButton}</span>
              </div>
              <button
                className="edit-location-btn"
                onClick={() => {
                  setOriginSaved(false);
                  setOriginButton("");
                  setOriginInput("");
                }}
              >
                <FaEdit />
              </button>
            </div>
          ) : (
            <div className="input-row">
              <input
                type="text"
                className="location-input"
                placeholder={selectedToda ? "I-type ang pinagalingan..." : "Pumili muna ng TODA"}
                value={originInput}
                disabled={!selectedToda}
                onChange={(e) => setOriginInput(e.target.value)}
                onKeyDown={handleOriginKeyDown}
              />
              <button
                className="pick-btn"
                onClick={() => openModal("origin")}
                disabled={!selectedToda}
              >
                Pumili
              </button>
            </div>
          )}
        </div>

        {/* Destination */}
        <div className="location-section">
          <label className="field-label">
            <FaMapMarkerAlt /> Paroroonan (To):
          </label>
          {destinationSaved ? (
            <div className="saved-location-row">
              <div className="saved-location-box">
                <FaCheckCircle className="check-icon" />
                <span>{destinationButton}</span>
              </div>
              <button
                className="edit-location-btn"
                onClick={() => {
                  setDestinationSaved(false);
                  setDestinationButton("");
                  setDestinationInput("");
                }}
              >
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
              <button className="pick-btn" onClick={() => openModal("destination")}>
                Pumili
              </button>
            </div>
          )}
        </div>

        {/* Calculate Button */}
        <button className="calculate-btn" onClick={handleCalculate}>
          Kalkulahin ang Pamasahe
        </button>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">
              {isOriginModal ? "Piliin ang Pinagalingan" : "Piliin ang Paroroonan"}
            </h3>
            <input
              type="text"
              className="modal-search"
              placeholder="Maghanap ng lugar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
            <div className="modal-list">
              {filteredModalPlaces.length === 0 ? (
                <p className="modal-empty">
                  {isOriginModal && !selectedToda
                    ? "Pumili muna ng TODA"
                    : "Walang nahanap na lugar"}
                </p>
              ) : (
                filteredModalPlaces.map((place) => (
                  <button
                    key={place}
                    className="modal-item"
                    onClick={() => handleSetLocation(place)}
                  >
                    <FaMapMarkerAlt className="modal-pin" />
                    {place}
                  </button>
                ))
              )}
            </div>
            <button className="modal-close-btn" onClick={closeModal}>
              Isara
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
