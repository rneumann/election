import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../hooks/useTheme.js';
import ResponsiveButton from '../components/ResponsiveButton.jsx';
import { voterApi } from '../services/voterApi.js';

/**
 * Main dashboard for authenticated users.
 *
 * @returns User dashboard with election overview and navigation
 */
const Home = () => {
  const [elections, setElections] = useState([]);
  const { user, logout } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();

  // Redirect admins to admin page
  useEffect(() => {
    if (user?.role === 'admin') {
      navigate('/admin', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchElections = async () => {
      const response = await voterApi.getElections();
      setElections(response);
    };
    fetchElections();
  }, []);

  const dateOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  };
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
              {user?.role === 'committee' && 'Sie können Wahlen verwalten und Ergebnisse einsehen.'}
              {user?.role === 'voter' && 'Sie können an verfügbaren Wahlen teilnehmen.'}
            </p>
          </div>

          {/* Info Cards - For all users */}
          <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-1 gap-4 sm:gap-6 mt-6 sm:mt-8">
            {/* Card 1: Aktuelle Wahlen */}
            <div className="bg-gradient-to-br from-blue-100 to-blue-200 p-4 sm:p-6 rounded-lg border border-blue-200 hover:shadow-lg transition-shadow duration-200">
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
                {elections.length === 0 ? (
                  <p className="text-sm text-blue-600">Keine verfügbaren Wahlen gefunden.</p>
                ) : (
                  <ul className="space-y-4">
                    {elections.map((election) => (
                      <li
                        key={election.id}
                        className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex flex-col gap-2 cursor-pointer"
                      >
                        {/* Wahlart */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                          <span className="font-semibold text-sm text-blue-600">Wahlart:</span>
                          <span className="text-sm text-blue-600">{election.description}</span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                          <span className="font-semibold text-sm text-blue-600">Datum:</span>
                          <span className="text-sm text-blue-600">
                            <span className="block sm:inline">
                              von: {new Date(election.start).toLocaleString('de-DE', dateOptions)}
                            </span>
                            <span className="hidden sm:inline"> - </span>
                            <span className="block sm:inline">
                              bis: {new Date(election.end).toLocaleString('de-DE', dateOptions)}
                            </span>
                          </span>
                        </div>

                        {/* Icon */}
                        <div className="mt-2 sm:mt-0 w-5 h-5 text-blue-600">
                          <svg
                            className="w-5 h-5 text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                            />
                          </svg>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
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
                  <p className="text-green-700 text-xs sm:text-sm">Ihre abgegebenen Wahlstimmen</p>
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
