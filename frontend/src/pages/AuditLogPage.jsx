import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../hooks/useTheme.js';
import AuditLogTable from '../components/AuditLogTable.jsx'; // Deine Tabelle
import ResponsiveButton from '../components/ResponsiveButton.jsx';

const AuditLogPage = () => {
  const { user, logout } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();

  // Schutz: Nur Admins dürfen hier rein
  if (user?.role !== 'admin') {
    navigate('/home');
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header (Kopie vom Admin-Header für Konsistenz) */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-5">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
                  Audit Logs & Sicherheit
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                  Systemüberwachung · {user?.username}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/admin')}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Zurück zum Dashboard
              </button>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded hover:bg-gray-900 transition-colors"
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
            <h2 className="text-lg font-bold text-gray-800">System-Protokoll</h2>
            <p className="text-sm text-gray-500">
              Hier finden Sie eine revisionssichere Aufzeichnung aller sicherheitsrelevanten
              Vorgänge im System. Die Integrität wird durch kryptografische Verkettung (Hash-Chain)
              gewährleistet.
            </p>
          </div>

          {/* Hier binden wir deine Tabelle ein */}
          <AuditLogTable />
        </div>
      </main>
    </div>
  );
};

export default AuditLogPage;
