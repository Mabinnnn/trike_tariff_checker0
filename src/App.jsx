import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Home from "./pages/Home/Home";
import Checkerpage from "./pages/Checkerpage/Checkerpage";
import Resultpage from "./pages/Resultpage/Resultpage"; // Import your new file
import AdminDashboard from "./pages/Admin-site/AdminDashboard";

function AppContent() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check for Ctrl+A (or Cmd+A on Mac)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        navigate("/admin");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/checker" element={<Checkerpage />} />
      <Route path="/result" element={<Resultpage />} /> {/* Add this line */}
      <Route path="/admin" element={<AdminDashboard />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
