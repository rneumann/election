import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import { Spinner } from "./components/Spinner.jsx";
import AdminDashboard from "./pages/Admin.jsx";
import AuditLogPage from "./pages/AuditLogPage.jsx";
import Login from "./pages/Login.jsx";

/**
 * Main App component with routing.
 * Provides protected routes for admin dashboard and audit logs.
 *
 * @returns {React.ReactElement} App component with routes
 */
const App = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Spinner size={64} />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/admin"
        element={
          user && user.role === "admin" ? (
            <AdminDashboard />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/admin/audit"
        element={
          user && user.role === "admin" ? (
            <AuditLogPage />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
};

export default App;
