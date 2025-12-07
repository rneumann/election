import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../hooks/useTheme.js';
import ResponsiveButton from '../components/ResponsiveButton.jsx';
import { voterApi } from '../services/voterApi.js';
import { Modal } from '../components/Modal.jsx';
import { logger } from '../conf/logger/logger.js';
import authService from '../services/authService.js';
import { Header } from '../layout/Header.jsx';
import { Footer } from '../layout/Footer.jsx';
import { CandidateInfoModal } from '../components/candidateModal.jsx';

/**
 * Main dashboard for authenticated users.
 *
 * @returns User dashboard with election overview and navigation
 */
const Home = () => {
  const [electionsActive, setElectionsActive] = useState([]);
  const [electionsFuture, setElectionsFuture] = useState([]);
  const [electionsAlreadyVoted, setElectionsAlreadyVoted] = useState([]);

  const [infoOpen, setInfoOpen] = useState(false);
  const [infoElectionId, setInfoElectionId] = useState(null);

  const [open, setOpen] = useState(false);
  const [selectedElectionId, setSelectedElectionId] = useState(undefined);
  const { user } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();

  /**
   * Refreshes the list of active, future and already voted elections for the user.
   * It fetches the list of elections from the API and updates the state with the new data.
   * If an error occurs, it logs an error message to the console.
   */
  const refreshElections = useCallback(async () => {
    try {
      const [active, future, alreadyVoted] = await Promise.all([
        voterApi.getElections('active', user.username, false),
        voterApi.getElections('future', user.username, false),
        voterApi.getElections('active', user.username, true),
      ]);
      setElectionsActive(active);
      setElectionsFuture(future);
      setElectionsAlreadyVoted(alreadyVoted);
    } catch (err) {
      logger.error('Fehler beim Nachladen der Wahlen', err);
    }
  }, [user]);

  // Redirect admins to admin page
  useEffect(() => {
    if (user?.role === 'admin') {
      navigate('/admin', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user?.username) {
      return;
    }

    const init = async () => {
      try {
        if (!localStorage.getItem('csrfToken')) {
          await authService.getCsrfToken();
        }

        await refreshElections();
      } catch (err) {
        logger.error('Fehler beim Initialisieren', err);
      }
    };

    init();
  }, [user?.username, refreshElections]);

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
      <Header />

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
            {/* Card 1: Zukünftige Wahlen */}
            <div className="bg-gradient-to-br from-blue-100 to-blue-200 p-4 sm:p-6 rounded-lg border border-blue-200 hover:shadow-lg transition-shadow duration-200">
              <div className="flex items-start gap-3 mb-3">
                <div className="bg-green-500 text-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
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
                    Hier werden verfügbare Wahlen angezeigt, für Sie aktuell teilnehmen können.
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-blue-200">
                {Array.isArray(electionsActive) && electionsActive.length === 0 ? (
                  <p className="text-sm text-blue-600">Aktuell finden keine Wahlen statt.</p>
                ) : (
                  <ul className="space-y-4">
                    {electionsActive.map((election) => (
                      <li
                        key={election.id}
                        className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex flex-col gap-2"
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

                        {/* Button to start voting */}
                        <div>
                          <ResponsiveButton
                            size="small"
                            onClick={() => {
                              setOpen(true);
                              logger.debug(`current election id settet to: ${election.id}`);
                              setSelectedElectionId(election.id);
                            }}
                          >
                            Wahl starten
                          </ResponsiveButton>
                        </div>
                      </li>
                    ))}
                    <Modal
                      open={open}
                      setOpen={setOpen}
                      electionId={selectedElectionId}
                      refreshElections={refreshElections}
                    ></Modal>
                  </ul>
                )}
              </div>
            </div>

            {/* zukünftige Wahlen*/}
            <div className="bg-gradient-to-br from-blue-100 to-blue-200 p-4 sm:p-6 rounded-lg border border-blue-200 hover:shadow-lg transition-shadow duration-200">
              <div className="flex items-start gap-3 mb-3">
                <div className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    strokeWidth="1.5"
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-blue-900 mb-1">
                    Zukünftige Wahlen
                  </h3>
                  <p className="text-blue-700 text-xs sm:text-sm">
                    Hier werden Wahlen angezeigt, für die Sie bald abstimmen können!
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-blue-200">
                {Array.isArray(electionsFuture) && electionsFuture.length === 0 ? (
                  <p className="text-sm text-blue-600">Keine zukünftigen Wahlen gefunden.</p>
                ) : (
                  <ul className="space-y-4">
                    {electionsFuture.map((election) => (
                      <li
                        key={election.id}
                        className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex flex-col gap-2"
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

                        {/* Button to start voting */}
                        <div className="flex gap-2">
                          <ResponsiveButton
                            toolTip={election.test_election_active ? '' : 'Testwahl nicht aktiv'}
                            size="small"
                            disabled={!election.test_election_active}
                            onClick={() => {
                              setOpen(true);
                              logger.debug(`current election id settet to: ${election.id}`);
                              setSelectedElectionId(election.id);
                            }}
                          >
                            Testwahl starten
                          </ResponsiveButton>
                          <ResponsiveButton
                            size="small"
                            toolTip={'Hier können Sie Informationen über die Kandidaten abrufen.'}
                            onClick={() => {
                              setInfoElectionId(election.id);
                              setInfoOpen(true);
                            }}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="1.5"
                              stroke="currentColor"
                              className="size-5"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
                              />
                            </svg>
                          </ResponsiveButton>
                        </div>
                      </li>
                    ))}
                    <Modal
                      open={open}
                      setOpen={setOpen}
                      electionId={selectedElectionId}
                      refreshElections={refreshElections}
                    ></Modal>
                    <CandidateInfoModal
                      open={infoOpen}
                      onClose={() => setInfoOpen(false)}
                      electionId={infoElectionId}
                    />
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
                <span className="text-2xl font-bold text-green-600">
                  {Array.isArray(electionsAlreadyVoted) ? electionsAlreadyVoted.length : '0'}
                </span>
                <span className="text-xs text-green-600 ml-1">abgegeben</span>
              </div>
              {electionsAlreadyVoted.length > 0 ? (
                <div className="mt-4 pt-4 border-t border-green-200">
                  <ul className="space-y-3 max-h-40 overflow-y-auto">
                    {electionsAlreadyVoted.map((election) => (
                      <li
                        key={election.id}
                        className="p-3 bg-white shadow-sm border border-green-100 rounded-xl flex items-start gap-3 hover:shadow-md transition-all"
                      >
                        <div className="text-green-600 mt-0.5">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                        <span className="font-medium text-sm text-gray-700">
                          {election.description}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : undefined}
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
      <Footer />
    </div>
  );
};

export default Home;
