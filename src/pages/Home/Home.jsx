import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaFacebook, FaTimes } from "react-icons/fa";
import { IoClose } from "react-icons/io5";

import trikeLogoBlack from "../../assets/Logoblack-removebg-preview.png";
import trikeLogoWhite from "../../assets/Logowhite-removebg-preview.png";
import "./Home.css";

// Replace with the actual URL of Chezca's Facebook post
const CHEZCA_FB_URL  = "https://www.facebook.com/share/p/1Bvk8vq68H/";
const LGU_BULAN_URL  = "https://www.facebook.com/lgu.bulan";

const Home = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("trikeTheme");
    return saved !== null ? saved === "dark" : true;
  });

  // Show notice only if user has NOT permanently skipped it
  const [showNotice, setShowNotice] = useState(false);

  const navigate = useNavigate();

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    localStorage.setItem("trikeTheme", next ? "dark" : "light");
  };

  // Arrow clicked — show notice unless user already permanently skipped
  const handleArrowClick = () => {
    const skipped = localStorage.getItem("noticeSkipped") === "true";
    if (skipped) {
      navigate("/checker");
    } else {
      setShowNotice(true);
    }
  };

  // X button — close notice and go to checker; will show again next visit
  const handleClose = () => {
    setShowNotice(false);
    navigate("/checker");
  };

  // Skip button — permanently dismiss and go to checker
  const handleSkip = () => {
    localStorage.setItem("noticeSkipped", "true");
    setShowNotice(false);
    navigate("/checker");
  };

  return (
    <div className={`splash-container ${isDarkMode ? "dark-mode" : "light-mode"}`}>
      <div className="lines-overlay"></div>

      <div className="content">
        <div className="logo-section">
          <div className="logo-container">

            <div className="sun-icon" onClick={toggleTheme} style={{ cursor: "pointer" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill={isDarkMode ? "white" : "black"} className="bi bi-brightness-high-fill" viewBox="0 0 16 16">
                <path d="M12 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0M8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0m0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13m8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5M3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8m10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0m-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0m9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707M4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708"/>
              </svg>
            </div>

            <img
              src={isDarkMode ? trikeLogoWhite : trikeLogoBlack}
              alt="Trike Logo"
              className="trike-img"
            />
          </div>

          <div className="road-line"></div>
          <h1 className="title">TrikeTariffChecker</h1>
        </div>

        <div className="navigation-icon">
          <div className="arrow-box">
            <button
              className="arrow-circle"
              onClick={handleArrowClick}
            >
              <img src="/Arrow.svg" alt="Go to Checker" width={50} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Notice Popup ─────────────────────────────────────────────────── */}
      {showNotice && (
        <div className="notice-overlay">
          <div className={`notice-modal ${isDarkMode ? "notice-dark" : "notice-light"}`}>

            {/* Top-left X — closes & navigates, but notice reappears next time */}
             <button className="notice-close-btn" onClick={handleClose}>
                X
             </button>

            <div className="notice-header">
              <span className="notice-badge">📢 Notice</span>
            </div>

            <p className="notice-body">
              All fare data shown in this system are based on the official guidelines
              of the <strong>LGU-Bulan</strong>. These fares are specifically set to
              ensure that students receive fair, affordable, and consistent
              transportation rates for their daily travel.
            </p>

            {/* Facebook links */}
            <div className="notice-fb-links">

              <a
                href={LGU_BULAN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="notice-fb-btn"
                aria-label="LGU Bulan Facebook page"
              >
                <FaFacebook className="notice-fb-icon" />
                <span>LGU Bulan</span>
              </a>
            </div>

            {/* Bottom-left Skip — permanently hides the notice */}
            <div className="notice-footer">
              <button className="notice-skip-btn" onClick={handleSkip}>
                Skip — Don't show again
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Home;