import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { AlertProvider } from './context/AlertContext.jsx';
import Login from './pages/Login';
import Home from './pages/Home';
import AuthCallback from './pages/AuthCallback';
import { CandidatePage } from './pages/CandidatePage.jsx';

const SimulateBanner = () => {
  const [active, setActive] = useState(false);

  useEffect(() => {
    fetch('/api/simulate/status')
      .then((r) => r.json())
      .then((d) => setActive(d.simulateMode === true))
      .catch(() => {});
  }, []);

  if (!active) return null;

  return (
    <div className="bg-yellow-400 text-yellow-900 text-sm font-semibold text-center py-2 px-4 flex items-center justify-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      SIMULATE MODE AKTIV — Authentifizierung ohne LDAP. Nicht für den Produktivbetrieb!
    </div>
  );
};

/**
 * Protected route wrapper that enforces authentication.
 * Displays loading state during session validation,
 * renders children if authenticated, or redirects to login page.
 *
 * @param {object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render when authenticated
 * @returns Authenticated content, loading spinner, or redirect to /login
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

/**
 * Application routing configuration.
 * Defines all application routes: /login, /auth/callback, /home, and catch-all redirect.
 * Applies ProtectedRoute wrapper to authenticated pages.
 *
 * @returns Configured React Router routes with authentication guards
 */
const AppRoutes = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/home" replace /> : <Login />}
      />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/candidate"
        element={
          user?.isCandidate ? (
            <ProtectedRoute>
              <CandidatePage />
            </ProtectedRoute>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

/**
 * Root application component.
 * Initializes authentication context provider and renders routing structure.
 * Provides global auth state management to all child components.
 *
 * @returns Application root with AuthProvider and routing configuration
 */
const App = () => {
  return (
    <AuthProvider>
      <AlertProvider>
        <div className="min-h-screen bg-brand-light">
          <SimulateBanner />
          <AppRoutes />
        </div>
      </AlertProvider>
    </AuthProvider>
  );
};

export default App;
