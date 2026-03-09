import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom"; 
import "./Resultpage.css";
import { FaCheckCircle } from "react-icons/fa";

import logoWhite from "../../assets/Logowhite-removebg-preview.png";
import logoBlack from "../../assets/Logoblack-removebg-preview.png";

export default function Resultpage() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Receives data from Checkerpage (fare data is now passed directly)
  const { origin, destination, selectedToda, fareMin, fareMax } = location.state || { 
    origin: "N/A", 
    destination: "N/A", 
    selectedToda: "Regular",
    fareMin: null,
    fareMax: null
  };

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // Get fare display text
  const getFareText = () => {
    if (fareMin === null || fareMax === null) {
      return "₱35"; // Default fallback
    }
    if (fareMin === fareMax) {
      return `₱${fareMin}`;
    }
    return `₱${fareMin} - ₱${fareMax}`;
  };

  // UPDATED: Navigates back to Home
  const handleDone = () => {
    navigate("/");
  };

  return (
    <div className={`result-page ${isDarkMode ? "dark-mode" : "light-mode"}`}>
      <div className="container">
        <div className="header-section">
          <div className="sun-icon-btn" onClick={toggleTheme}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill={isDarkMode ? "white" : "black"} className="bi bi-brightness-high-fill" viewBox="0 0 16 16">
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

        <div className="result-card-container">
          <div className="top-grey-area">
            <div className="location-item">
              <label>Pinagalingan (From:)</label>
              <div className="location-result-text">{origin}</div>
            </div>
            <div className="location-item">
              <label>Paroroonan (to:)</label>
              <div className="location-result-text">{destination}</div>
            </div>
            {selectedToda && (
              <div className="location-item">
                <label>TODA:</label>
                <div className="location-result-text">{selectedToda}</div>
              </div>
            )}
          </div>

          <div className="bottom-green-area">
            <div className="calc-status">
              <FaCheckCircle className="check-svg" />
              <span>Student Fare</span>
            </div>
            <div className="fare-display-box">
              <span>{getFareText()}</span>
            </div>
            <div className="button-group">
              <button className="btn-white" onClick={handleDone}>Done</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
