import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Login from './pages/Login';
import Home from './pages/Home';
import AuthCallback from './pages/AuthCallback';

/**
 * Protected route component that redirects to login if not authenticated.
 *
 * @param {object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render if authenticated
 * @returns {React.ReactElement} Protected content or redirect
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

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

/**
 * Application routes component.
 * Manages routing between login and protected pages.
 *
 * @returns {React.ReactElement} Routes component
 */
const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

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
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

/**
 * Main application component with authentication context.
 * Wraps entire app with AuthProvider for global auth state.
 *
 * @returns {React.ReactElement} App component with routes
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
