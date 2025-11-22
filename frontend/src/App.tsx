import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Header from "./components/Header";
import LandingPage from "./pages/LandingPage";
import SignUp from "./pages/SignUp";
import SignIn from "./pages/SignIn";
import SignUpSuccess from "./pages/SignUpSuccess";
import RidePostAndRequestPage from "./pages/RidePostAndRequestPage";
import UserSettingsPage from "./pages/UserSettingsPage";
import Ridesearch from "./pages/Ridesearch";
import Dashboard from "./pages/Dashboard";
import TripDetails from "./pages/TripDetails";
import VerifyEmail from "./pages/VerifyEmail";
import AdminDashboard from "./pages/AdminDashboard";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Header />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/signup/success" element={<SignUpSuccess />} />
          <Route path="/rides" element={<RidePostAndRequestPage />} />
          <Route path="/ridesearch" element={<Ridesearch />} />
          <Route path="/trip/:id" element={<TripDetails />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<UserSettingsPage />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
