import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Login from './pages/Login';
import Home from './pages/Home';
import AuthCallback from './pages/AuthCallback';
import Admin from './pages/Admin';

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
        path="/admin"
        element={
          <ProtectedRoute>
            <Admin />
          </ProtectedRoute>
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
      <div className="min-h-screen bg-brand-light">
        <AppRoutes />
      </div>
    </AuthProvider>
  );
};

export default App;
