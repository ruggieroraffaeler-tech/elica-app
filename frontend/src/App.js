import React, { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, useTheme } from "next-themes";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Toaster } from "./components/ui/sonner";
import NetworkStatus from "./components/NetworkStatus";
import { startAutoSync } from "./lib/offline";

// Pages
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AthleteManagement from "./pages/admin/AthleteManagement";
import AthleteDashboard from "./pages/athlete/AthleteDashboard";
import AthletePhotos from "./pages/athlete/AthletePhotos";
import AthleteVideos from "./pages/athlete/AthleteVideos";
import AthleteChecks from "./pages/athlete/AthleteChecks";
import AthleteExercises from "./pages/athlete/AthleteExercises";

// Aggiorna il colore della barra del browser/telefono in base al tema
const ThemeColorSync = () => {
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", resolvedTheme === "dark" ? "#0b0c0a" : "#eff0eb");
    // icona nella scheda del browser: chiara in modalità chiara, scura in modalità scura
    const icon = document.querySelector('link[rel="icon"][type="image/svg+xml"]');
    if (icon && resolvedTheme) icon.setAttribute("href", `/favicon-${resolvedTheme === "dark" ? "dark" : "light"}.svg`);
  }, [resolvedTheme]);
  return null;
};

const ProtectedRoute = ({ children, requireAdmin = false, requireAthlete = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (requireAdmin && user.role !== "admin") {
    return <Navigate to="/athlete" replace />;
  }

  if (requireAthlete && user.role !== "athlete") {
    return <Navigate to="/admin" replace />;
  }

  return children;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={user ? <Navigate to={user.role === "admin" ? "/admin" : "/athlete"} replace /> : <LoginPage />}
      />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requireAdmin>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/athlete/:athleteId"
        element={
          <ProtectedRoute requireAdmin>
            <AthleteManagement />
          </ProtectedRoute>
        }
      />

      {/* Athlete Routes */}
      <Route
        path="/athlete"
        element={
          <ProtectedRoute requireAthlete>
            <AthleteDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/athlete/exercises"
        element={
          <ProtectedRoute requireAthlete>
            <AthleteExercises />
          </ProtectedRoute>
        }
      />
      <Route
        path="/athlete/checks"
        element={
          <ProtectedRoute requireAthlete>
            <AthleteChecks />
          </ProtectedRoute>
        }
      />
      <Route
        path="/athlete/photos"
        element={
          <ProtectedRoute requireAthlete>
            <AthletePhotos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/athlete/videos"
        element={
          <ProtectedRoute requireAthlete>
            <AthleteVideos />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  // Invio automatico dei salvataggi fatti senza rete
  useEffect(() => {
    startAutoSync();
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="lc-theme" disableTransitionOnChange>
      <ThemeColorSync />
      <AuthProvider>
        <BrowserRouter>
          <NetworkStatus />
          <AppRoutes />
          <Toaster position="top-right" />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
