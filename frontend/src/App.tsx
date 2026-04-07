import { useEffect, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";

import Header from './components/Header';
import Footer from './components/Footer';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CasePage from './pages/CasePage';
import ResidentDetailPage from './pages/ResidentDetailPage';
import DonatePage from "./pages/DonatePage";
import DonorsPage from "./pages/DonorPage";
import { AuthService } from "./api/AuthService";

function ScrollToHash() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) {
      return;
    }

    const elementId = location.hash.replace("#", "");
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location]);

  return null;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(AuthService.isAuthenticated());

  useEffect(() => {
    const syncAuthState = () => setIsAuthenticated(AuthService.isAuthenticated());

    window.addEventListener("auth-change", syncAuthState);
    window.addEventListener("storage", syncAuthState);

    return () => {
      window.removeEventListener("auth-change", syncAuthState);
      window.removeEventListener("storage", syncAuthState);
    };
  }, []);

  return (
    <>
      <ScrollToHash />
      <Header isAuthenticated={isAuthenticated} />

      <main>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/cases" element={<CasePage />} />
          <Route path="/cases/:id" element={<ResidentDetailPage />} />
          <Route path="/donate" element={<DonatePage />} />
          <Route path="/donors" element={<DonorsPage />} />

        </Routes>
      </main>

      <Footer />
    </>
  );
}

export default App;
