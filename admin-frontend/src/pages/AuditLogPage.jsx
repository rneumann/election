import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../hooks/useTheme.js";
import AuditLogTable from "../components/AuditLogTable.jsx";

/**
 * Audit Log Page - Security and system monitoring
 *
 * Features:
 * - View all audit logs
 * - Filter and search logs
 * - Sort by different columns
 * - View detailed information for each log entry
 * - Blockchain integrity verification
 *
 * @returns {React.ReactElement} Audit log page
 */
const AuditLogPage = () => {
  const { user, logout } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();

  // Protection: Only admins allowed
  if (user?.role !== "admin") {
    navigate("/admin");
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-brand-primary text-white shadow-lg sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-5">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-white">
                  Audit Logs & Sicherheit
                </h1>
                <p className="text-xs sm:text-sm text-gray-100 mt-0.5 opacity-90">
                  Systemüberwachung · {user?.username}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate("/admin")}
                className="px-4 py-2 text-sm font-medium text-white hover:text-gray-200 border border-white/30 rounded hover:bg-white/10 transition-colors"
              >
                Zurück zum Dashboard
              </button>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm font-medium text-white border border-white/30 rounded hover:bg-white/10 transition-colors"
              >
                Abmelden
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-6 border-b pb-4">
            <h2 className="text-lg font-bold text-gray-800">
              System-Protokoll
            </h2>
            <p className="text-sm text-gray-500">
              Hier finden Sie eine revisionssichere Aufzeichnung aller
              sicherheitsrelevanten Vorgänge im System. Die Integrität wird
              durch kryptografische Verkettung (Hash-Chain) gewährleistet.
            </p>
          </div>

          {/* Audit Log Table Component */}
          <AuditLogTable />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
            <div>{theme.text.copyright}</div>
            <div>Version 1.0.0</div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AuditLogPage;
