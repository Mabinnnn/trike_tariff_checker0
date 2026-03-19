import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

// ── NEW: tier keys now match fares.tiers keys in MongoDB ─────────────────────
// "50-59" | "60-69" | "70-79" | "80-89" | "90-99"
const FARE_KEYS = [
  { key: "50-59", label: "Gas ₱50–59" },
  { key: "60-69", label: "Gas ₱60–69" },
  { key: "70-79", label: "Gas ₱70–79" },
  { key: "80-89", label: "Gas ₱80–89" },
  { key: "90-99", label: "Gas ₱90–99" },
];

const TIER_BUTTONS = [
  { key: "50-59", label: "⛽ ₱50–59" },
  { key: "60-69", label: "⛽ ₱60–69" },
  { key: "70-79", label: "⛽ ₱70–79" },
  { key: "80-89", label: "⛽ ₱80–89" },
  { key: "90-99", label: "⛽ ₱90–99" },
];

export default function AdminDashboard() {
  const navigate = useNavigate();

  // ── auth ──────────────────────────────────────────────────────────────────
  const [isLoggedIn,  setIsLoggedIn]  = useState(false);

  // ── ui state ──────────────────────────────────────────────────────────────
  const [activeTab,   setActiveTab]   = useState("places");
  const [loading,     setLoading]     = useState(false);
  const [message,     setMessage]     = useState("");

  // ── active gasoline tier (stored in MongoDB) ──────────────────────────────
  // Default "50-59" — matches the new fares.tiers key format
  const [activeTier,  setActiveTier]  = useState("50-59");
  const [tierSaving,  setTierSaving]  = useState(false);

  // ── gmail state ───────────────────────────────────────────────────────────
  const [gmailToken,    setGmailToken]    = useState(null);
  const [gmailUser,     setGmailUser]     = useState("");
  const [gmailError,    setGmailError]    = useState("");
  const [emailTo,       setEmailTo]       = useState("");
  const [emailSubject,  setEmailSubject]  = useState("");
  const [emailBody,     setEmailBody]     = useState("");
  const [emailSending,  setEmailSending]  = useState(false);

  // ── places state ──────────────────────────────────────────────────────────
  const [places,      setPlaces]      = useState([]);
  const [searchTerm,  setSearchTerm]  = useState("");
  const [filterCat,   setFilterCat]   = useState("all");
  const [editPlace,   setEditPlace]   = useState(null);
  const [editTiers,   setEditTiers]   = useState({});       // fares.tiers
  const [editEmergency, setEditEmergency] = useState("");   // fares.emergency_provisional_php
  const [editDist,    setEditDist]    = useState("");

  // ── fetch places ──────────────────────────────────────────────────────────
  const fetchPlaces = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BACKEND_URL}/api/admin/places`);
      const data = await res.json();
      if (data.status === "success") setPlaces(data.places);
    } catch {
      setMessage("❌ Error loading places");
    } finally {
      setLoading(false);
    }
  };

  // ── fetch active tier from MongoDB ────────────────────────────────────────
  const fetchActiveTier = async () => {
    try {
      const res  = await fetch(`${BACKEND_URL}/api/admin/settings/active-tier`);
      const data = await res.json();
      if (data.status === "success" && data.activeTier) {
        setActiveTier(data.activeTier);
      }
    } catch {
      // silently keep default
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchPlaces();
      fetchActiveTier();
    }
  }, [isLoggedIn]);

  // ── save active tier to MongoDB ───────────────────────────────────────────
  const handleTierChange = async (tierKey) => {
    setTierSaving(true);
    setMessage("");
    try {
      const res  = await fetch(`${BACKEND_URL}/api/admin/settings/active-tier`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeTier: tierKey }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setActiveTier(tierKey);
        const found = TIER_BUTTONS.find((t) => t.key === tierKey);
        setMessage(`✅ Active fare tier set to "${found?.label}" and saved to database.`);
      } else {
        setMessage(`❌ Failed to save tier: ${data.message}`);
      }
    } catch {
      setMessage("❌ Could not connect to server to save tier.");
    } finally {
      setTierSaving(false);
    }
  };

  // ── open edit form ────────────────────────────────────────────────────────
  // Reads from place.fares.tiers and place.fares.emergency_provisional_php
  const openEdit = (place) => {
    setEditPlace(place);
    setEditTiers({
      "50-59": place.fares?.tiers?.["50-59"] ?? "",
      "60-69": place.fares?.tiers?.["60-69"] ?? "",
      "70-79": place.fares?.tiers?.["70-79"] ?? "",
      "80-89": place.fares?.tiers?.["80-89"] ?? "",
      "90-99": place.fares?.tiers?.["90-99"] ?? "",
    });
    setEditEmergency(place.fares?.emergency_provisional_php ?? "");
    setEditDist(place.distance ?? "");
    setMessage("");
  };

  // ── save fares ────────────────────────────────────────────────────────────
  // Sends fares.tiers + fares.emergency_provisional_php to backend
  const handleSave = async () => {
    setLoading(true);
    try {
      const tiers = {};
      FARE_KEYS.forEach(({ key }) => {
        const val = editTiers[key];
        tiers[key] = val === "" || val === null ? null : parseFloat(val);
      });

      const updatedFares = {
        ...editPlace.fares,                     // keep route / route_label / distance_km
        emergency_provisional_php: editEmergency === "" ? null : parseFloat(editEmergency),
        tiers,
      };

      const res  = await fetch(`${BACKEND_URL}/api/admin/places/${editPlace._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fares: updatedFares, distance: editDist || null }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setPlaces((prev) => prev.map((p) => p._id === editPlace._id ? data.place : p));
        setEditPlace(null);
        setMessage(`✅ "${data.place.name}" updated successfully!`);
      } else {
        setMessage(`❌ ${data.message}`);
      }
    } catch {
      setMessage("❌ Error saving place");
    } finally {
      setLoading(false);
    }
  };

  // ── delete place ──────────────────────────────────────────────────────────
  const handleDelete = async (place) => {
    if (!confirm(`Delete "${place.name}"?`)) return;
    setLoading(true);
    try {
      const res  = await fetch(`${BACKEND_URL}/api/admin/places/${place._id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.status === "success") {
        setPlaces((prev) => prev.filter((p) => p._id !== place._id));
        setMessage(`✅ "${place.name}" deleted.`);
      } else {
        setMessage(`❌ ${data.message}`);
      }
    } catch {
      setMessage("❌ Error deleting place");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    disconnectGmail();
    navigate("/");
  };

  // ── connect Gmail via OAuth ───────────────────────────────────────────────
  const connectGmail = () => {
    const clientId    = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const redirectUri = "https://triketariffchecker0.vercel.app/admin";
    const scope       = "https://www.googleapis.com/auth/gmail.send email profile";
    const authUrl     = `https://accounts.google.com/o/oauth2/v2/auth`
      + `?client_id=${encodeURIComponent(clientId)}`
      + `&redirect_uri=${encodeURIComponent(redirectUri)}`
      + `&response_type=token`
      + `&scope=${encodeURIComponent(scope)}`
      + `&prompt=select_account`;
    window.location.href = authUrl;
  };

  // ── pick up token from URL hash after OAuth redirect ─────────────────────
useEffect(() => {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const token = params.get("access_token");

  if (!token) return;

  window.history.replaceState(null, "", window.location.pathname);

  fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((r) => r.json())
    .then((data) => {
      const email = (data.email || "").toLowerCase().trim();

      // ✅ ADD ALL ADMINS HERE
      const ALLOWED_ADMINS = [
        "estrabelaedison8@gmail.com",
        "marvinlarosa28@gmail.com"
      ];

      if (ALLOWED_ADMINS.includes(email)) {

        setGmailToken(token);
        setGmailUser(data.email);
        setGmailError("");
        setIsLoggedIn(true);

      } else {

        setGmailError(
          `⛔ Access denied. "${data.email}" is not an authorized admin account.`
        );

        setGmailToken(null);
        setGmailUser("");
      }
    })
    .catch(() => {
      setGmailError("❌ Could not verify Gmail account. Please try again.");
    });

}, []);

  // ── send email via Gmail API ──────────────────────────────────────────────
  const handleSendEmail = async () => {
    if (!emailTo || !emailSubject || !emailBody) {
      setMessage("❌ Please fill in all email fields.");
      return;
    }
    setEmailSending(true);
    try {
      const raw = btoa(
        `To: ${emailTo}\r\nSubject: ${emailSubject}\r\n\r\n${emailBody}`
      ).replace(/\+/g, "-").replace(/\//g, "_");

      const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method:  "POST",
        headers: {
          Authorization:  `Bearer ${gmailToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw }),
      });

      if (res.ok) {
        setMessage("✅ Email sent successfully!");
        setEmailTo(""); setEmailSubject(""); setEmailBody("");
      } else {
        const err = await res.json();
        setMessage(`❌ Failed to send email: ${err?.error?.message || "Token may have expired. Reconnect Gmail."}`);
        if (res.status === 401) { setGmailToken(null); setGmailUser(""); }
      }
    } catch {
      setMessage("❌ Error sending email.");
    } finally {
      setEmailSending(false);
    }
  };

  // ── disconnect Gmail ──────────────────────────────────────────────────────
  const disconnectGmail = () => {
    setGmailToken(null);
    setGmailUser("");
    setGmailError("");
    setEmailTo(""); setEmailSubject(""); setEmailBody("");
  };

  const filtered = places.filter((p) => {
    const matchCat    = filterCat === "all" || p.category === filterCat;
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCat && matchSearch;
  });

  const isActiveCol = (key) => key === activeTier;

  // Helper: read a tier value from a place document safely
  // Reads from place.fares.tiers[key]
  const getTierVal = (place, key) => place.fares?.tiers?.[key];

  // ── login screen ──────────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div className="admin-container">
        <div className="login-modal-overlay">
          <div className="login-modal">
            <h2 className="login-modal-title">Admin Login</h2>
            <p style={{ color: "#9ca3af", fontSize: "0.85rem", textAlign: "center", marginBottom: 24 }}>
              Sign in with the authorized Gmail account to access the dashboard.
            </p>

            {/* ── Wrong Gmail error ── */}
            {gmailError && (
              <div style={{
                background: "#3b0000", border: "1px solid #ef4444",
                borderRadius: 8, padding: "12px 14px", marginBottom: 16,
                color: "#fca5a5", fontSize: "0.82rem", lineHeight: 1.5,
              }}>
                {gmailError}
                <br />
                <button
                  onClick={() => setGmailError("")}
                  style={{
                    marginTop: 8, padding: "4px 12px", borderRadius: 6,
                    border: "1px solid #ef4444", background: "transparent",
                    color: "#f87171", cursor: "pointer", fontSize: "0.78rem",
                  }}
                >
                  Dismiss
                </button>
              </div>
            )}

            <button
              onClick={connectGmail}
              style={{
                width: "100%", padding: "12px", borderRadius: 8, border: "none",
                background: "#4285F4", color: "#fff",
                fontWeight: 700, cursor: "pointer", fontSize: "1rem",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
                <path fill="#fff" d="M44.5 20H24v8.5h11.7C34.2 33.6 29.6 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 2.9l6-6C34.4 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.2-4z"/>
              </svg>
              Sign in with Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 className="admin-title">Admin Dashboard</h1>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <button
            onClick={() => {
              disconnectGmail();
              setActiveTab("gmail");
              setMessage("");
              connectGmail();
            }}
            title={gmailUser ? `Connected: ${gmailUser} — Click to switch` : "No Gmail connected"}
            style={{
              padding: "5px 14px", borderRadius: 7,
              border: "1px solid #4285F4",
              background: gmailToken ? "#1a2a4a" : "#1f2937",
              color: gmailToken ? "#93c5fd" : "#6b7280",
              cursor: "pointer", fontSize: "0.78rem", fontWeight: 600,
              display: "flex", alignItems: "center", gap: 6,
              transition: "all 0.15s",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
              <path fill={gmailToken ? "#93c5fd" : "#6b7280"} d="M44.5 20H24v8.5h11.7C34.2 33.6 29.6 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 2.9l6-6C34.4 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.2-4z"/>
            </svg>
            {gmailToken ? `Switch Gmail (${gmailUser})` : "Switch Gmail Acc"}
          </button>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {message && <div className="success-message">{message}</div>}

      {/* ── TABS ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button
          onClick={() => setActiveTab("places")}
          style={{
            padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer",
            background: activeTab === "places" ? "#22c55e" : "#333", color: "#fff", fontWeight: 600,
          }}
        >
          📍 Places & Fares
        </button>
        
      </div>

      {activeTab === "places" && (
        <>
          {/* ── GASOLINE TIER SELECTOR ──────────────────────────────────────── */}
          <div style={{
            background: "#111827",
            border: "1px solid #374151",
            borderRadius: 12,
            padding: "14px 18px",
            marginBottom: 20,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{ color: "#9ca3af", fontSize: "0.82rem", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                ⛽ Active Gasoline Tier
              </span>
              <span style={{
                background: "#1f2937", color: "#6ee7b7",
                fontSize: "0.75rem", padding: "2px 10px",
                borderRadius: 20, border: "1px solid #374151",
              }}>
                Saved to MongoDB · Shown on Checker Page
              </span>
              {tierSaving && (
                <span style={{ color: "#facc15", fontSize: "0.75rem" }}>⏳ Saving to database...</span>
              )}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {TIER_BUTTONS.map(({ key, label }) => {
                const isActive = isActiveCol(key);
                return (
                  <button
                    key={key}
                    onClick={() => handleTierChange(key)}
                    disabled={tierSaving}
                    style={{
                      padding: "8px 16px", borderRadius: 8,
                      border:      isActive ? "2px solid #22c55e" : "2px solid #374151",
                      background:  isActive ? "#14532d"           : "#1f2937",
                      color:       isActive ? "#4ade80"           : "#9ca3af",
                      fontWeight:  isActive ? 700                 : 500,
                      fontSize: "0.85rem",
                      cursor: tierSaving ? "not-allowed" : "pointer",
                      transition: "all 0.15s ease",
                      boxShadow: isActive ? "0 0 0 3px rgba(34,197,94,0.2)" : "none",
                      position: "relative",
                      opacity: tierSaving && !isActive ? 0.5 : 1,
                    }}
                  >
                    {label}
                    {isActive && (
                      <span style={{
                        position: "absolute", top: -8, right: -6,
                        background: "#22c55e", color: "#000",
                        fontSize: "0.6rem", fontWeight: 800,
                        padding: "1px 5px", borderRadius: 10,
                      }}>
                        ACTIVE
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <p style={{ color: "#6b7280", fontSize: "0.75rem", marginTop: 10, marginBottom: 0 }}>
              This setting is persisted in MongoDB Atlas. Every passenger will see fares based on the active tier — no browser storage used.
            </p>
          </div>

          {/* ── FILTERS ─────────────────────────────────────────────────────── */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="🔍 Search place..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #444", background: "#1e1e1e", color: "#fff", flex: 1, minWidth: 180 }}
            />
            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #444", background: "#1e1e1e", color: "#fff" }}
            >
              <option value="all">All Categories</option>
              <option value="landmark">Landmark</option>
              <option value="zone">Zone</option>
              <option value="barangay">Barangay</option>
              <option value="sitio">Sitio</option>
              <option value="food">Food</option>
              <option value="hospital">Hospital</option>
              <option value="government">Government</option>
              <option value="market">Market</option>
              <option value="school">School</option>
              <option value="supermarket">Supermarket</option>
              <option value="terminal">Terminal</option>
              <option value="port">Port</option>
              <option value="resort">Resort</option>
            </select>
            <span style={{ color: "#aaa", alignSelf: "center" }}>{filtered.length} places</span>
          </div>

          {/* ── PLACES TABLE ────────────────────────────────────────────────── */}
          <div style={{ overflowX: "auto" }}>
            <table className="tariff-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Distance</th>
                  <th
                    title="Emergency / Provisional fare"
                    style={{ whiteSpace: "nowrap", color: "#facc15" }}
                  >
                    🚨 Emerg.
                  </th>
                  {[
                    { key: "50-59", label: "₱50–59" },
                    { key: "60-69", label: "₱60–69" },
                    { key: "70-79", label: "₱70–79" },
                    { key: "80-89", label: "₱80–89" },
                    { key: "90-99", label: "₱90–99" },
                  ].map(({ key, label }) => (
                    <th
                      key={key}
                      onClick={() => handleTierChange(key)}
                      title={`Set "${label}" as active tier`}
                      style={{
                        cursor: "pointer",
                        background:   isActiveCol(key) ? "#14532d"           : undefined,
                        color:        isActiveCol(key) ? "#4ade80"           : undefined,
                        borderBottom: isActiveCol(key) ? "3px solid #22c55e" : undefined,
                        userSelect: "none", whiteSpace: "nowrap",
                        transition: "background 0.15s",
                      }}
                    >
                      {label}
                      {isActiveCol(key) && (
                        <span style={{ marginLeft: 4, fontSize: "0.65rem", opacity: 0.8 }}>▲</span>
                      )}
                    </th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && filtered.length === 0 ? (
                  <tr><td colSpan="11" className="empty">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan="11" className="empty">No places found.</td></tr>
                ) : (
                  filtered.map((place) => (
                    <tr key={place._id}>
                      <td>{place.name}</td>
                      <td>
                        <span style={{
                          padding: "2px 8px", borderRadius: 12, fontSize: "0.75rem", fontWeight: 600,
                          background: place.category === "barangay"   ? "#1d4ed8"
                            : place.category === "zone"      ? "#7c3aed"
                            : place.category === "landmark"  ? "#b45309"
                            : place.category === "hospital"  ? "#991b1b"
                            : place.category === "food"      ? "#92400e"
                            : place.category === "market"    ? "#065f46"
                            : place.category === "school"    ? "#1e3a5f"
                            : "#065f46",
                          color: "#fff",
                        }}>
                          {place.category}
                        </span>
                      </td>
                      <td>{place.distance ?? (place.fares?.distance_km ? `${place.fares.distance_km} km` : "—")}</td>

                      {/* Emergency / Provisional */}
                      <td style={{ color: "#facc15", fontWeight: 600 }}>
                        {place.fares?.emergency_provisional_php != null
                          ? `₱${place.fares.emergency_provisional_php}`
                          : "—"}
                      </td>

                      {/* Gas tier columns — read from fares.tiers */}
                      {["50-59", "60-69", "70-79", "80-89", "90-99"].map((key) => {
                        const val = getTierVal(place, key);
                        return (
                          <td
                            key={key}
                            style={{
                              background:  isActiveCol(key) ? "rgba(20,83,45,0.45)" : undefined,
                              color:       isActiveCol(key) ? "#4ade80"             : undefined,
                              fontWeight:  isActiveCol(key) ? 700                   : undefined,
                              borderLeft:  isActiveCol(key) ? "2px solid #22c55e"  : undefined,
                              borderRight: isActiveCol(key) ? "2px solid #22c55e"  : undefined,
                            }}
                          >
                            {val != null ? `₱${val}` : "—"}
                          </td>
                        );
                      })}

                      <td>
                        <button className="edit-btn"   onClick={() => openEdit(place)}>Edit</button>
                        <button className="delete-btn" onClick={() => handleDelete(place)}>Delete</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── GMAIL TAB ─────────────────────────────────────────────────────── */}
      {activeTab === "gmail" && (
        <div style={{ maxWidth: 540 }}>
          <h2 style={{ color: "#22c55e", marginBottom: 4 }}>📧 Send Email</h2>
          <p style={{ color: "#6b7280", fontSize: "0.8rem", marginBottom: 20 }}>
            Only <strong style={{ color: "#e5e7eb" }}>{ALLOWED_ADMIN_GMAIL}</strong> is authorized to connect.
          </p>

          {/* ── Error: wrong Gmail ── */}
          {gmailError && (
            <div style={{
              background: "#3b0000", border: "1px solid #ef4444",
              borderRadius: 10, padding: "14px 18px", marginBottom: 20,
              color: "#fca5a5", fontSize: "0.9rem", lineHeight: 1.5,
            }}>
              {gmailError}
              <br />
              <button
                onClick={() => setGmailError("")}
                style={{
                  marginTop: 10, padding: "6px 14px", borderRadius: 6,
                  border: "1px solid #ef4444", background: "transparent",
                  color: "#f87171", cursor: "pointer", fontSize: "0.8rem",
                }}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* ── Not connected ── */}
          {!gmailToken && !gmailError && (
            <div style={{
              background: "#111827", border: "1px solid #374151",
              borderRadius: 12, padding: "32px", textAlign: "center",
            }}>
              <p style={{ color: "#9ca3af", marginBottom: 20, fontSize: "0.9rem" }}>
                Connect the authorized Gmail account to send emails from this dashboard.
              </p>
              <button
                onClick={connectGmail}
                style={{
                  padding: "10px 28px", borderRadius: 8, border: "none",
                  background: "#4285F4", color: "#fff",
                  fontWeight: 700, cursor: "pointer", fontSize: "1rem",
                  display: "inline-flex", alignItems: "center", gap: 8,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
                  <path fill="#fff" d="M44.5 20H24v8.5h11.7C34.2 33.6 29.6 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 2.9l6-6C34.4 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.2-4z"/>
                </svg>
                Connect Gmail Account
              </button>
            </div>
          )}

          {/* ── Connected — send form ── */}
          {gmailToken && (
            <div>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "#052e16", border: "1px solid #22c55e",
                borderRadius: 10, padding: "10px 16px", marginBottom: 20,
              }}>
                <span style={{ color: "#4ade80", fontSize: "0.88rem" }}>
                  ✅ Connected as <strong>{gmailUser}</strong>
                </span>
                <button
                  onClick={disconnectGmail}
                  style={{
                    padding: "4px 12px", borderRadius: 6,
                    border: "1px solid #374151", background: "#1f2937",
                    color: "#9ca3af", cursor: "pointer", fontSize: "0.75rem",
                  }}
                >
                  Disconnect
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ color: "#9ca3af", fontSize: "0.8rem", display: "block", marginBottom: 4 }}>To</label>
                  <input
                    type="email" placeholder="recipient@email.com" value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #374151", background: "#1e1e1e", color: "#fff", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ color: "#9ca3af", fontSize: "0.8rem", display: "block", marginBottom: 4 }}>Subject</label>
                  <input
                    type="text" placeholder="Email subject" value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #374151", background: "#1e1e1e", color: "#fff", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ color: "#9ca3af", fontSize: "0.8rem", display: "block", marginBottom: 4 }}>Message</label>
                  <textarea
                    placeholder="Write your message here..." value={emailBody} rows={7}
                    onChange={(e) => setEmailBody(e.target.value)}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #374151", background: "#1e1e1e", color: "#fff", resize: "vertical", boxSizing: "border-box" }}
                  />
                </div>
                <button
                  onClick={handleSendEmail} disabled={emailSending}
                  style={{
                    padding: "11px", borderRadius: 8, border: "none",
                    background: emailSending ? "#374151" : "#22c55e",
                    color: emailSending ? "#9ca3af" : "#000",
                    fontWeight: 700, cursor: emailSending ? "not-allowed" : "pointer",
                    fontSize: "1rem", transition: "all 0.15s",
                  }}
                >
                  {emailSending ? "⏳ Sending..." : "📤 Send Email"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── EDIT MODAL ───────────────────────────────────────────────────────── */}
      {editPlace && (
        <div className="login-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setEditPlace(null); }}>
          <div className="login-modal" style={{ maxWidth: 480, width: "100%" }}>
            <h3 style={{ marginBottom: 16, color: "#22c55e" }}>✏️ Edit: {editPlace.name}</h3>

            {/* Route info (read-only) */}
            {editPlace.fares?.route && (
              <div style={{
                background: "#1f2937", borderRadius: 8, padding: "8px 12px",
                marginBottom: 12, fontSize: "0.8rem", color: "#9ca3af",
              }}>
                🛣 Route: <strong style={{ color: "#e5e7eb" }}>{editPlace.fares.route_label || editPlace.fares.route}</strong>
                {editPlace.fares.distance_km && (
                  <span> · {editPlace.fares.distance_km} km</span>
                )}
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <label style={{ color: "#aaa", fontSize: "0.85rem" }}>Distance (display string)</label>
              <input
                type="text"
                value={editDist}
                onChange={(e) => setEditDist(e.target.value)}
                placeholder="e.g. 3.5 km"
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #444", background: "#1e1e1e", color: "#fff", marginTop: 4 }}
              />
            </div>

            {/* Emergency provisional fare */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ color: "#facc15", fontSize: "0.85rem", fontWeight: 600 }}>
                🚨 Emergency / Provisional Fare (₱)
              </label>
              <input
                type="number"
                value={editEmergency}
                onChange={(e) => setEditEmergency(e.target.value)}
                placeholder="null"
                style={{
                  width: "100%", padding: "8px 12px", borderRadius: 8,
                  border: "1px solid #facc15", background: "#1e1e1e", color: "#fff", marginTop: 4,
                }}
              />
            </div>

            <p style={{ color: "#aaa", fontSize: "0.85rem", marginBottom: 8 }}>⛽ Gasoline Fare Tiers (₱)</p>
            {FARE_KEYS.map(({ key, label }) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <label style={{
                  color: isActiveCol(key) ? "#4ade80" : "#ccc",
                  fontSize: "0.85rem", width: 160, flexShrink: 0,
                  fontWeight: isActiveCol(key) ? 700 : 400,
                }}>
                  {label}
                  {isActiveCol(key) && (
                    <span style={{ marginLeft: 6, fontSize: "0.65rem", background: "#14532d", padding: "1px 6px", borderRadius: 8, border: "1px solid #22c55e" }}>
                      ACTIVE
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  value={editTiers[key] ?? ""}
                  onChange={(e) => setEditTiers((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder="null"
                  style={{
                    flex: 1, padding: "6px 10px", borderRadius: 8,
                    border:     isActiveCol(key) ? "1px solid #22c55e" : "1px solid #444",
                    background: isActiveCol(key) ? "#0d1f13"           : "#1e1e1e",
                    color: "#fff",
                  }}
                />
              </div>
            ))}

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="add-btn"    onClick={handleSave} disabled={loading} style={{ flex: 1 }}>
                {loading ? "Saving..." : "💾 Save Changes"}
              </button>
              <button className="cancel-btn" onClick={() => setEditPlace(null)} style={{ flex: 1 }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
