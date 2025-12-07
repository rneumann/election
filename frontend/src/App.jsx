import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { AlertProvider } from './context/AlertContext.jsx';
import Login from './pages/Login';
import Home from './pages/Home';
import AuthCallback from './pages/AuthCallback';
import Admin from './pages/Admin';
import api from './services/api.js';

//NEU
import AuditLogPage from './pages/AuditLogPage.jsx';
import { CandidatePage } from './pages/CandidatePage.jsx';

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
  const { isAuthenticated, loading, logout } = useAuth();
  const location = useLocation();

  // Validate session on every route change
  useEffect(() => {
    const validateOnNavigation = async () => {
      try {
        const { data } = await api.get('/auth/me', { withCredentials: true });
        if (!data?.authenticated) {
          // Session is invalid, force logout
          logout();
        }
      } catch {
        // API call failed, user is not authenticated
        logout();
      }
    };

    if (isAuthenticated) {
      validateOnNavigation();
    }
  }, [location.pathname, isAuthenticated, logout]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-light">
        <div className="text-brand-primary text-xl font-semibold">Loading...</div>
      </div>
    );
  }

  // If not authenticated, redirect to login with current location as returnUrl
  if (!isAuthenticated) {
    const currentPath = window.location.pathname;
    return <Navigate to={`/login?returnUrl=${encodeURIComponent(currentPath)}`} replace />;
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
        element={
          isAuthenticated ? (
            <Navigate to={user?.role === 'admin' ? '/admin' : '/home'} replace />
          ) : (
            <Login />
          )
        }
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
          <ProtectedRoute>
            <CandidatePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <Admin />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />

      {/* NEU: Audit Log Route */}
      <Route
        path="/admin/audit"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AuditLogPage />
          </ProtectedRoute>
        }
      />
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
          <AppRoutes />
        </div>
      </AlertProvider>
    </AuthProvider>
  );
};

export default App;
