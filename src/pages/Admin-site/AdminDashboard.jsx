import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

// Use Vite environment variable for the backend URL
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://triketrafficcheckerbackend.onrender.com";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [tariffs, setTariffs] = useState([]);
  const [routeNo, setRouteNo] = useState("");
  const [todaName, setTodaName] = useState("");
  const [location, setLocation] = useState("");
  const [studentFareMin, setStudentFareMin] = useState("");
  const [studentFareMax, setStudentFareMax] = useState("");
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(true);

  // Login handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    setLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.status === "success") {
        setIsLoggedIn(true);
        setShowLoginModal(false);
        fetchRoutes();
      } else {
        setLoginError(data.message || "Login failed");
      }
    } catch (error) {
      setLoginError("Cannot connect to server. Make sure backend is running on port 5000.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch all routes
  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/routes`);
      const data = await response.json();

      if (data.status === "success") {
        setTariffs(data.routes || []);
      }
    } catch (error) {
      console.error("Error fetching routes:", error);
      setMessage("Error loading routes");
    } finally {
      setLoading(false);
    }
  };

  // Load routes when logged in
  useEffect(() => {
    if (isLoggedIn) {
      fetchRoutes();
    }
  }, [isLoggedIn]);

  // ADD tariff
  const handleAdd = async () => {
    if (!routeNo || !todaName || !location || !studentFareMin || !studentFareMax) {
      alert("Please fill all fields");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          route_no: routeNo,
          toda_name: todaName,
          location,
          student_fare_min: parseFloat(studentFareMin),
          student_fare_max: parseFloat(studentFareMax),
        }),
      });

      const data = await response.json();

      if (data.status === "success") {
        setTariffs(data.routes || []);
        clearForm();
        setMessage("Route added successfully!");
      } else {
        alert(data.message || "Failed to add route");
      }
    } catch (error) {
      console.error("Error adding route:", error);
      alert("Error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  // DELETE tariff
  const handleDelete = async (routeNoToDelete) => {
    if (!confirm("Are you sure you want to delete this route?")) return;

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ route_no: routeNoToDelete }),
      });

      const data = await response.json();

      if (data.status === "success") {
        setTariffs(data.routes || []);
        setMessage("Route deleted successfully!");
      } else {
        alert(data.message || "Failed to delete route");
      }
    } catch (error) {
      console.error("Error deleting route:", error);
      alert("Error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  // EDIT tariff - populate form
  const handleEdit = (tariff) => {
    setRouteNo(tariff.route_no.toString());
    setTodaName(tariff.toda_name);
    setLocation(tariff.location);
    setStudentFareMin(tariff.student_fare_min.toString());
    setStudentFareMax(tariff.student_fare_max.toString());
    setEditId(tariff.route_no);
  };

  // UPDATE tariff
  const handleUpdate = async () => {
    if (!routeNo || !todaName || !location || !studentFareMin || !studentFareMax) {
      alert("Please fill all fields");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          route_no: routeNo,
          toda_name: todaName,
          location,
          student_fare_min: parseFloat(studentFareMin),
          student_fare_max: parseFloat(studentFareMax),
        }),
      });

      const data = await response.json();

      if (data.status === "success") {
        setTariffs(data.routes || []);
        clearForm();
        setMessage("Route updated successfully!");
      } else {
        alert(data.message || "Failed to update route");
      }
    } catch (error) {
      console.error("Error updating route:", error);
      alert("Error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  // Clear form
  const clearForm = () => {
    setRouteNo("");
    setTodaName("");
    setLocation("");
    setStudentFareMin("");
    setStudentFareMax("");
    setEditId(null);
  };

  // LOGOUT function
  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername("");
    setPassword("");
    clearForm();
    setMessage("");
    navigate("/");
  };

  // If not logged in, show login modal
  if (!isLoggedIn) {
    return (
      <div className="admin-container">
        {/* Login Modal */}
        <div className="login-modal-overlay">
          <div className="login-modal">
            <h2 className="login-modal-title">Admin Login</h2>
            <form onSubmit={handleLogin} className="login-modal-form">
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {loginError && <p className="error-message">{loginError}</p>}
              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>
            <p className="login-hint">
              Default: Username: admin | Password: 12345
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <h1 className="admin-title">Admin Tariff Dashboard</h1>

      {/* Logout Button */}
      <div className="logout-container">
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>

      {message && <div className="success-message">{message}</div>}

      {/* FORM */}
      <div className="tariff-form">
        <div className="form-row">
          <input
            type="number"
            placeholder="Route Number"
            value={routeNo}
            onChange={(e) => setRouteNo(e.target.value)}
            disabled={editId !== null}
          />
          <input
            type="text"
            placeholder="TODA Name"
            value={todaName}
            onChange={(e) => setTodaName(e.target.value)}
          />
        </div>
        <div className="form-row">
          <input
            type="text"
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
        <div className="form-row">
          <input
            type="number"
            placeholder="Min Fare (₱)"
            value={studentFareMin}
            onChange={(e) => setStudentFareMin(e.target.value)}
          />
          <input
            type="number"
            placeholder="Max Fare (₱)"
            value={studentFareMax}
            onChange={(e) => setStudentFareMax(e.target.value)}
          />
        </div>
        <div className="form-btns">
          {editId ? (
            <>
              <button className="update-btn" onClick={handleUpdate} disabled={loading}>
                {loading ? "Updating..." : "Update"}
              </button>
              <button className="cancel-btn" onClick={clearForm}>
                Cancel
              </button>
            </>
          ) : (
            <button className="add-btn" onClick={handleAdd} disabled={loading}>
              {loading ? "Adding..." : "Add Route"}
            </button>
          )}
        </div>
      </div>

      {/* TABLE */}
      <table className="tariff-table">
        <thead>
          <tr>
            <th>Route No.</th>
            <th>TODA Name</th>
            <th>Location</th>
            <th>Min Fare</th>
            <th>Max Fare</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {loading && tariffs.length === 0 ? (
            <tr>
              <td colSpan="6" className="empty">Loading...</td>
            </tr>
          ) : tariffs.length === 0 ? (
            <tr>
              <td colSpan="6" className="empty">
                No routes added yet. Add a route to get started.
              </td>
            </tr>
          ) : (
            tariffs.map((tariff) => (
              <tr key={tariff.route_no}>
                <td>{tariff.route_no}</td>
                <td>{tariff.toda_name}</td>
                <td>{tariff.location}</td>
                <td>₱{tariff.student_fare_min}</td>
                <td>₱{tariff.student_fare_max}</td>
                <td>
                  <button
                    className="edit-btn"
                    onClick={() => handleEdit(tariff)}
                  >
                    Edit
                  </button>
                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(tariff.route_no)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}