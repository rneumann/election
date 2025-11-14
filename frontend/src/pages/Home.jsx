import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../hooks/useTheme.js';
import ResponsiveButton from '../components/ResponsiveButton.jsx';

/**
 * Main dashboard for authenticated users.
 *
 * @returns User dashboard with election overview and navigation
 */
const Home = () => {
  const { user, logout } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();
  const [elections, setElections] = useState([]);

  // TODO: Fetch elections from backend when API is ready
  useEffect(() => {
    const fetchElections = async () => {
      if (user?.role === 'admin') {
        // Mock data - replace with actual backend call: const { data } = await api.get('/admin/elections')
        setElections([
          // Example structure when backend is ready:
          // { id: 1, name: 'Senatswahl 2025', status: 'draft', createdAt: '2025-11-14', listsCount: 3 }
        ]);
      }
    };
    fetchElections();
  }, [user]);

  return (
    <div className="min-h-screen flex flex-col bg-brand-light">
      {/* Header - Sticky on scroll */}
      <header className="bg-brand-primary text-white shadow-lg sticky top-0 z-10">
        <div className="container mx-auto px-3 sm:px-6 py-2 sm:py-3 md:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-xl md:text-2xl font-bold truncate">
                {theme.institution.name} {theme.text.appTitle}
              </h1>
              <p className="text-xs sm:text-sm opacity-90 truncate">
                <span className="hidden sm:inline">Angemeldet als: </span>
                <span className="font-semibold">{user?.username}</span>
                <span className="hidden sm:inline"> ({theme.roles[user?.role] || user?.role})</span>
              </p>
            </div>
            <div className="self-start sm:self-auto">
              <ResponsiveButton variant="secondary" size="small" onClick={logout}>
                Abmelden
              </ResponsiveButton>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Flex-1 to push footer down */}
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 md:p-8 border border-gray-100">
          <h2 className="text-2xl sm:text-3xl font-bold text-brand-dark mb-3 sm:mb-4">
            {theme.text.welcomeTitle}
          </h2>
          <p className="text-sm sm:text-base text-brand-gray mb-4 sm:mb-6">
            {theme.text.welcomeSubtitle}
          </p>

          {/* User Role Info */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-3 sm:p-4 mb-4 sm:mb-6">
            <p className="text-xs sm:text-sm text-blue-700">
              <strong>Ihre Rolle:</strong>{' '}
              {user?.role === 'admin' && 'Sie haben vollständigen Administrationszugriff.'}
              {user?.role === 'committee' && 'Sie können Wahlen verwalten und Ergebnisse einsehen.'}
              {user?.role === 'voter' && 'Sie können an verfügbaren Wahlen teilnehmen.'}
            </p>
          </div>

          {/* Admin Dashboard */}
          {user?.role === 'admin' && (
            <div className="space-y-6">
              {/* Compact Action Button */}
              <div className="flex justify-end">
                <ResponsiveButton
                  variant="primary"
                  size="medium"
                  onClick={() => navigate('/admin/upload')}
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    <span>Wahl hochladen</span>
                  </div>
                </ResponsiveButton>
              </div>

              {/* Elections Table */}
              {elections.length > 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Angelegte Wahlen</h3>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {elections.map((election) => {
                      return (
                        <div
                          key={election.id}
                          className="px-6 py-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 mb-1">{election.name}</h4>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                  </svg>
                                  {new Date(election.createdAt).toLocaleDateString('de-DE')}
                                </span>
                                <span className="flex items-center gap-1">
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                    />
                                  </svg>
                                  {election.listsCount} Listen
                                </span>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    election.status === 'active'
                                      ? 'bg-green-100 text-green-700'
                                      : election.status === 'draft'
                                        ? 'bg-yellow-100 text-yellow-700'
                                        : 'bg-gray-100 text-gray-700'
                                  }`}
                                >
                                  {election.status === 'active'
                                    ? 'Aktiv'
                                    : election.status === 'draft'
                                      ? 'Entwurf'
                                      : 'Beendet'}
                                </span>
                              </div>
                            </div>
                            <ResponsiveButton variant="outline" size="small">
                              Details
                            </ResponsiveButton>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                    <svg
                      className="w-8 h-8 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Wahlen vorhanden</h3>
                  <p className="text-gray-600 mb-6">
                    Laden Sie eine Excel-Datei hoch, um eine neue Wahl zu erstellen
                  </p>
                  <ResponsiveButton variant="primary" onClick={() => navigate('/admin/upload')}>
                    Erste Wahl erstellen
                  </ResponsiveButton>
                </div>
              )}
            </div>
          )}

          {/* Info Cards - Only for non-admin users */}
          {user?.role !== 'admin' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-6 sm:mt-8">
              {/* Card 1: Aktuelle Wahlen */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 sm:p-6 rounded-lg border border-blue-200 hover:shadow-lg transition-shadow duration-200">
                <div className="flex items-start gap-3 mb-3">
                  <div className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-blue-900 mb-1">
                      Aktuelle Wahlen
                    </h3>
                    <p className="text-blue-700 text-xs sm:text-sm">
                      Hier werden verfügbare Wahlen angezeigt
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <span className="text-2xl font-bold text-blue-600">0</span>
                  <span className="text-xs text-blue-600 ml-1">verfügbar</span>
                </div>
              </div>

              {/* Card 2: Meine Stimmen */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 sm:p-6 rounded-lg border border-green-200 hover:shadow-lg transition-shadow duration-200">
                <div className="flex items-start gap-3 mb-3">
                  <div className="bg-green-600 text-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-green-900 mb-1">
                      Meine Stimmen
                    </h3>
                    <p className="text-green-700 text-xs sm:text-sm">
                      Ihre abgegebenen Wahlstimmen
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-green-200">
                  <span className="text-2xl font-bold text-green-600">0</span>
                  <span className="text-xs text-green-600 ml-1">abgegeben</span>
                </div>
              </div>

              {/* Card 3: Ergebnisse */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 sm:p-6 rounded-lg border border-purple-200 hover:shadow-lg transition-shadow duration-200">
                <div className="flex items-start gap-3 mb-3">
                  <div className="bg-purple-600 text-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-purple-900 mb-1">
                      Ergebnisse
                    </h3>
                    <p className="text-purple-700 text-xs sm:text-sm">
                      Veröffentlichte Wahlergebnisse
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-purple-200">
                  <span className="text-2xl font-bold text-purple-600">0</span>
                  <span className="text-xs text-purple-600 ml-1">verfügbar</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer - Always visible at bottom */}
      <footer className="bg-brand-dark text-white py-3 sm:py-4 mt-auto border-t border-gray-800">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs sm:text-sm opacity-90">{theme.text.copyright}</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
