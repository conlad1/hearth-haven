import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import Header from './components/Header';
import Footer from './components/Footer';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CasePage from './pages/CasePage';
import ResidentDetailPage from './pages/ResidentDetailPage';
import DonatePage from "./pages/DonatePage";
import ThankYouPage from "./pages/ThankYouPage";
import DonorsPage from "./pages/DonorPage";
import AllocationPage from "./pages/AllocationPage";
import ImpactDashboard from "./pages/ImpactDashboard";
import { AuthService } from "./api/AuthService";
import OutreachPage from "./pages/OutreachPage";
import SafehouseManagementPage from "./pages/SafehouseManagementPage";
import SafehouseDetailPage from "./pages/SafehouseDetailPage";
import PartnerDetailPage from "./pages/PartnerDetailPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsPage from "./pages/TermsPage";
import TeapotPage from "./pages/TeapotPage";
import CookieConsentBanner from "./components/CookieConsentBanner";
import ResourcesPage from "./pages/ResourcePage";
import DonorAnalytics from "./pages/DonorAnalytics";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return AuthService.isAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />;
}

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

function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [pathname, hash]);

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
      <ScrollToTop />
      <ScrollToHash />
      <Header isAuthenticated={isAuthenticated} />
      <CookieConsentBanner />

      <main>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/cases" element={<CasePage />} />
          <Route path="/cases/:id" element={<ResidentDetailPage />} />
          <Route
            path="/admin"
            element={(
              <ProtectedRoute>
                <AdminDashboardPage />
              </ProtectedRoute>
            )}
          />
          <Route path="/safehouse-management" element={<SafehouseManagementPage />} />
          <Route path="/safehouse-management/safehouses/:id" element={<SafehouseDetailPage />} />
          <Route path="/safehouse-management/partners/:id" element={<PartnerDetailPage />} />
          <Route path="/donate" element={<DonatePage />} />
          <Route path="/donate/thank-you" element={<ThankYouPage />} />
          <Route path="/impact" element={<ImpactDashboard />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/teapot" element={<TeapotPage />} />
          <Route path="/resources" element={<ResourcesPage />} />
          <Route
            path="/outreach"
            element={(
              <ProtectedRoute>
                <OutreachPage />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/donors"
            element={(
              <ProtectedRoute>
                <DonorsPage />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/donor-analytics"
            element={(
              <ProtectedRoute>
                <DonorAnalytics />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/allocations"
            element={(
              <ProtectedRoute>
                <AllocationPage />
              </ProtectedRoute>
            )}
          />
        </Routes>
      </main>

      <Footer />
    </>
  );
}

export default App;
