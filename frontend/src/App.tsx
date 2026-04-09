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
import SocialMediaPage from "./pages/SocialMediaPage";
import ImpactDashboard from "./pages/ImpactDashboard";
import { AuthService, type CurrentUser } from "./api/AuthService";
import { AppRoles, getCurrentRole } from './authz';
import OutreachPage from "./pages/OutreachPage";
import SafehouseManagementPage from "./pages/SafehouseManagementPage";
import AdminLayout from "./components/AdminLayout";
import SafehouseDetailPage from "./pages/SafehouseDetailPage";
import PartnerDetailPage from "./pages/PartnerDetailPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import ReportsPage from "./pages/ReportsPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsPage from "./pages/TermsPage";
import TeapotPage from "./pages/TeapotPage";
import CookieConsentBanner from "./components/CookieConsentBanner";
import ResourcesPage from "./pages/ResourcePage";
import DonorAnalytics from "./pages/DonorAnalytics";
import ProfilePage from "./pages/ProfilePage";
import AccessDeniedPage from "./pages/AccessDeniedPage";
import { AuthSessionProvider } from './authSession';

type ProtectedRouteProps = {
  children: React.ReactNode;
  isAuthenticated: boolean;
  sessionReady: boolean;
  currentUser: CurrentUser | null;
  allowedRoles?: Array<string>;
};

function ProtectedRoute({ children, isAuthenticated, sessionReady, currentUser, allowedRoles }: ProtectedRouteProps) {
  const role = getCurrentRole(currentUser);

  if (!sessionReady) {
    return <p className="py-20 text-center text-gray-500 dark:text-gray-400">Checking access...</p>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && (!role || !allowedRoles.includes(role))) {
    return <Navigate to="/forbidden" replace />;
  }

  return <>{children}</>;
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

function getStaffLandingRoute(user: CurrentUser | null): string {
  const roles = user?.roles ?? [];

  if (roles.includes(AppRoles.Admin)) {
    return '/admin';
  }

  if (roles.includes(AppRoles.CaseManager)) {
    return '/cases';
  }

  if (roles.includes(AppRoles.DonationsManager)) {
    return '/donors';
  }

  if (roles.includes(AppRoles.OutreachManager)) {
    return '/outreach';
  }

  return '/profile';
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const syncSession = async () => {
      setSessionReady(false);

      try {
        const user = await AuthService.me();
        if (!cancelled) {
          setCurrentUser(user);
          setIsAuthenticated(true);
        }
      } catch {
        if (!cancelled) {
          setCurrentUser(null);
          setIsAuthenticated(false);
        }
      } finally {
        if (!cancelled) {
          setSessionReady(true);
        }
      }
    };

    void syncSession();

    window.addEventListener("auth-change", syncSession);
    window.addEventListener("storage", syncSession);

    return () => {
      cancelled = true;
      window.removeEventListener("auth-change", syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, []);

  return (
    <AuthSessionProvider value={{ isAuthenticated, sessionReady, currentUser }}>
      <>
        <ScrollToTop />
        <ScrollToHash />
        <Header isAuthenticated={isAuthenticated} currentUser={currentUser} />
        <CookieConsentBanner />

        <main>
          <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forbidden" element={<AccessDeniedPage />} />
          {/* Protected routes with persistent sidebar */}
          <Route element={<AdminLayout />}>
            <Route
              path="/admin"
              element={(
                <ProtectedRoute
                  isAuthenticated={isAuthenticated}
                  sessionReady={sessionReady}
                  currentUser={currentUser}
                  allowedRoles={[AppRoles.Admin, AppRoles.CaseManager, AppRoles.DonationsManager, AppRoles.OutreachManager]}
                >
                  {getCurrentRole(currentUser) === AppRoles.Admin
                    ? <AdminDashboardPage />
                    : <Navigate to={getStaffLandingRoute(currentUser)} replace />}
                </ProtectedRoute>
              )}
            />
            <Route
              path="/admin/users"
              element={(
                <ProtectedRoute isAuthenticated={isAuthenticated} sessionReady={sessionReady} currentUser={currentUser} allowedRoles={[AppRoles.Admin]}>
                  <AdminUsersPage />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/cases"
              element={(
                <ProtectedRoute isAuthenticated={isAuthenticated} sessionReady={sessionReady} currentUser={currentUser} allowedRoles={[AppRoles.Admin, AppRoles.CaseManager]}>
                  <CasePage />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/cases/:id"
              element={(
                <ProtectedRoute isAuthenticated={isAuthenticated} sessionReady={sessionReady} currentUser={currentUser} allowedRoles={[AppRoles.Admin, AppRoles.CaseManager]}>
                  <ResidentDetailPage />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/safehouse-management"
              element={(
                <ProtectedRoute isAuthenticated={isAuthenticated} sessionReady={sessionReady} currentUser={currentUser} allowedRoles={[AppRoles.Admin, AppRoles.CaseManager]}>
                  <SafehouseManagementPage />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/safehouse-management/safehouses/:id"
              element={(
                <ProtectedRoute isAuthenticated={isAuthenticated} sessionReady={sessionReady} currentUser={currentUser} allowedRoles={[AppRoles.Admin, AppRoles.CaseManager]}>
                  <SafehouseDetailPage />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/safehouse-management/partners/:id"
              element={(
                <ProtectedRoute isAuthenticated={isAuthenticated} sessionReady={sessionReady} currentUser={currentUser} allowedRoles={[AppRoles.Admin, AppRoles.CaseManager]}>
                  <PartnerDetailPage />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/donors"
              element={(
                <ProtectedRoute isAuthenticated={isAuthenticated} sessionReady={sessionReady} currentUser={currentUser} allowedRoles={[AppRoles.Admin, AppRoles.DonationsManager]}>
                  <DonorsPage />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/outreach"
              element={(
                <ProtectedRoute isAuthenticated={isAuthenticated} sessionReady={sessionReady} currentUser={currentUser} allowedRoles={[AppRoles.Admin, AppRoles.OutreachManager]}>
                  <OutreachPage />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/social-media"
              element={(
                <ProtectedRoute isAuthenticated={isAuthenticated} sessionReady={sessionReady} currentUser={currentUser} allowedRoles={[AppRoles.Admin, AppRoles.OutreachManager]}>
                  <SocialMediaPage />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/reports"
              element={(
                <ProtectedRoute isAuthenticated={isAuthenticated} sessionReady={sessionReady} currentUser={currentUser} allowedRoles={[AppRoles.Admin, AppRoles.OutreachManager]}>
                  <ReportsPage />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/donor-analytics"
              element={(
                <ProtectedRoute isAuthenticated={isAuthenticated} sessionReady={sessionReady} currentUser={currentUser} allowedRoles={[AppRoles.Admin, AppRoles.DonationsManager]}>
                  <DonorAnalytics />
                </ProtectedRoute>
              )}
            />
          </Route>

          {/* Public routes */}
          <Route path="/donate" element={<DonatePage />} />
          <Route path="/donate/thank-you" element={<ThankYouPage />} />
          <Route path="/impact" element={<ImpactDashboard />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/teapot" element={<TeapotPage />} />
          <Route path="/resources" element={<ResourcesPage />} />
          <Route
            path="/donor-portal"
            element={(
              <ProtectedRoute isAuthenticated={isAuthenticated} sessionReady={sessionReady} currentUser={currentUser}>
                <Navigate to="/profile" replace />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/profile"
            element={(
              <ProtectedRoute isAuthenticated={isAuthenticated} sessionReady={sessionReady} currentUser={currentUser}>
                <ProfilePage />
              </ProtectedRoute>
            )}
          />
          </Routes>
        </main>

        <Footer isAuthenticated={isAuthenticated} currentUser={currentUser} />
      </>
    </AuthSessionProvider>
  );
}

export default App;
