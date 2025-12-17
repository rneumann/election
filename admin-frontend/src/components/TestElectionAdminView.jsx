import { useEffect, useState } from 'react';
import { adminService } from '../services/adminApi';
import { logger } from '../conf/logger/logger';
import { useAlert } from '../context/AlertContext';
import ResponsiveButton from './ResponsiveButton';
import { Alert } from './Alert';

export const TestElectionAdminView = () => {
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [selectedElectionId, setSelectedElectionId] = useState(null);
  const [futureElections, setFutureElections] = useState([]);
  const { showAlert } = useAlert();

  const dateOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  };

  const handleToggle = async (electionId) => {
    try {
      await adminService.handleToggleElection(electionId);
      const elections = await adminService.getElectionsForAdmin('future');
      setFutureElections(elections);
      logger.debug('Updated futureElections:', futureElections);
    } catch (error) {
      logger.error('Error toggling election:', error);
    }
  };

  const handleDeleteTestData = async (electionId) => {
    try {
      await adminService.deleteTestElectionData(electionId);
      setFutureElections(await adminService.getElectionsForAdmin('future'));
      showAlert('success', 'Testdaten wurden geloescht');
    } catch (error) {
      logger.error('Error deleting test data');
      logger.debug(error);
      showAlert('error', 'Testdaten konnten nicht geloescht werden');
    }
  };

  useEffect(() => {
    const fetchFutureElections = async () => {
      const elections = await adminService.getElectionsForAdmin('future');
      if (elections.length === 0) {
        logger.debug('No future elections found');
      }
      setFutureElections(elections);
    };

    fetchFutureElections();
  }, []);
  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">Testwahl Starten/Stoppen</h2>
          <ul className="list-disc list-inside pl-5">
            <li>Hier können Sie die Testwahl starten und stoppen.</li>
            <li>Zudem können Sie Daten einer Testwahl löschen.</li>
          </ul>
        </div>
        <div className="p-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <svg
                className="w-5 h-5 text-yellow-600 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div className="text-sm text-yellow-900">
                <p className="font-semibold mb-1">Warnung:</p>
                <ul className="list-disc list-inside pl-5">
                  <li>
                    {' '}
                    Durch das aktivieren oder stoppen einer Wahl, wird allen berechtigten Usern die
                    Abstimmung ermöglicht.
                  </li>
                  <li>
                    {' '}
                    Stellen Sie sicher, dass Sie die Daten einer Wahl expotiert haben bevor Sie
                    diese löschen.
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {futureElections?.length !== 0 ? (
            <ul className="space-y-4">
              {futureElections.map((election) => (
                <li
                  key={election.id}
                  className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex flex-col gap-2"
                >
                  {/* Wahlart */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                    <span className="font-semibold text-sm text-blue-600 dark:text-white transition-colors">
                      Wahlart:
                    </span>
                    <span className="text-sm text-blue-600 dark:text-white transition-colors">
                      {election.description}
                    </span>
                  </div>

                  {/* Datum */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                    <span className="font-semibold text-sm text-blue-600 dark:text-white transition-colors">
                      Datum:
                    </span>
                    <span className="text-sm text-blue-600 dark:text-white transition-colors">
                      <span className="block sm:inline">
                        von: {new Date(election.start).toLocaleString('de-DE', dateOptions)}
                      </span>
                      <span className="hidden sm:inline"> – </span>
                      <span className="block sm:inline">
                        bis: {new Date(election.end).toLocaleString('de-DE', dateOptions)}
                      </span>
                    </span>
                  </div>

                  {/* Button */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                    <ResponsiveButton
                      size="small"
                      variant="primary"
                      className="group inline-flex items-center"
                      onClick={() => handleToggle(election.id)}
                    >
                      Testwahl {election.test_election_active ? 'stoppen' : 'starten'}
                      {!election.test_election_active ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.5"
                          stroke="currentColor"
                          className="size-5 ml-2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
                          />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.5"
                          stroke="currentColor"
                          className="size-5 ml-2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15.75 5.25v13.5m-7.5-13.5v13.5"
                          />
                        </svg>
                      )}
                    </ResponsiveButton>

                    <ResponsiveButton
                      size="small"
                      variant="primary"
                      onClick={() => {
                        setSelectedElectionId(election.id);
                        setShowDeleteAlert(true);
                      }}
                    >
                      Testwahldaten löschen!
                    </ResponsiveButton>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-6">Keine möglichen Testwahlen vorhanden!</p>
            </div>
          )}
        </div>
      </div>
      <div className="border-b border-gray-200 px-6 py-4 mt-5" />

      {showDeleteAlert && (
        <Alert
          message="Möchten Sie die Testwahldaten wirklich löschen? Dieser Vorgang kann nicht rückgängig gemacht werden."
          setShowAlert={setShowDeleteAlert}
          onConfirm={() => handleDeleteTestData(selectedElectionId)}
        />
      )}
    </>
  );
};
