import { useEffect } from 'react';
import { logger } from '../conf/logger/logger';
import ResponsiveButton from './ResponsiveButton';

export const DeleteDataView = ({
  setShowConfirmAlert,
  setSelectedElectionForDeletion,
  loadingDeletionElections,
  electionsForDeletion,
  selectedElectionForDeletion,
  fetchElections,
}) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  useEffect(() => {
    fetchElections();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="p-6">
      <div className="mb-6">
        <label htmlFor="election-select" className="block text-sm font-medium text-gray-700 mb-2">
          Wahl auswählen <span className="text-red-500">*</span>
        </label>
        {loadingDeletionElections ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Wahlen werden geladen...</span>
          </div>
        ) : electionsForDeletion.length === 0 ? (
          <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
            Keine zukünftigen Wahlen verfügbar. Bitte legen Sie zuerst eine Wahl an.
          </div>
        ) : (
          <select
            id="election-select"
            value={selectedElectionForDeletion}
            onChange={(e) => {
              logger.debug(`Selected election for deletion: ${e.target.value}`);
              setSelectedElectionForDeletion(e.target.value);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
          >
            <option key="all" value="all">
              Alle Daten
            </option>
            {electionsForDeletion.map((election) => (
              <option key={election.id} value={election.id}>
                {election.info} ({formatDate(election.start)} - {formatDate(election.end)})
              </option>
            ))}
          </select>
        )}
      </div>

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
            <p className="text-yellow-800">
              Sie werden aufgefordert, diesen Schritt zu bestätigen, um die Daten nicht
              versehentlich zu löschen.
            </p>
          </div>
        </div>
      </div>
      <div className="text-center py-8">
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
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </div>
        <p className="text-gray-600 mb-6">Die Datenbank wird unwiederuflich geleert.</p>
        <ResponsiveButton
          variant="primary"
          size="medium"
          disabled={electionsForDeletion.length === 0}
          onClick={() => {
            setShowConfirmAlert(true);
          }}
        >
          Daten löschen
        </ResponsiveButton>
      </div>
    </div>
  );
};
