import { useState } from 'react';
import { logger } from '../conf/logger/logger';
import { voterApi } from '../services/voterApi';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { useTheme } from '../hooks/useTheme';
import ResponsiveButton from './ResponsiveButton';
import { Spinner } from './Spinner';

export const AlertForReferendum = ({
  setShowAlert,
  cleanedVotes,
  election,
  selectedOptionValues,
  invalidHandOver,
  onCancel,
  refreshElections,
  options,
}) => {
  const theme = useTheme();
  const [showSpinner, setShowSpinner] = useState(false);
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const createBallot = async (ballot) => {
    logger.debug(`createBallot: ${JSON.stringify(ballot)}, user: ${user.username}`);
    return await voterApi.createBallot(ballot, user.username);
  };

  const handleOnSubmit = async () => {
    setShowSpinner(true);

    try {
      const data = {
        electionId: String(election.id),
        valid: !invalidHandOver,
        voteDecision: invalidHandOver ? [] : [cleanedVotes],
      };

      const res = await createBallot(data);
      if (!res) {
        showAlert('error', 'Fehler beim Erstellen der Wahl... Bitte versuchen Sie es erneut.');
        return;
      }

      showAlert('success', 'Wahl erfolgreich erstellt');
    } catch {
      showAlert('error', 'Unerwarteter Fehler');
    } finally {
      setShowSpinner(false);
      setShowAlert(false);
      onCancel();
      await refreshElections();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 text-center py-4 px-6 rounded-3xl w-96 h-96 flex flex-col shadow-2xl border border-gray-200 dark:border-gray-700 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="font-bold text-gray-900 dark:text-gray-100 text-lg transition-colors">
          {theme.text.checkVote}
        </span>
        <ResponsiveButton
          disabled={showSpinner}
          onClick={() => setShowAlert(false)}
          size="icon"
          variant="icon"
          className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
            />
          </svg>
        </ResponsiveButton>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {invalidHandOver ? (
          <p className="text-red-500 dark:text-red-400 font-bold transition-colors">
            {theme.text.confirmationInvalid}
          </p>
        ) : (
          <ul className="space-y-3">
            {selectedOptionValues.map((obj, index) => {
              const optionName =
                options.find((opt) => String(opt.nr) === String(obj.value))?.name || 'Unbekannt';
              return (
                <li
                  key={index}
                  className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl p-3 flex justify-between items-center shadow hover:shadow-lg transition-all border border-gray-200 dark:border-gray-600"
                >
                  <span className="bg-blue-600 dark:bg-blue-500 text-white rounded-full px-3 py-1 text-sm font-medium transition-colors">
                    {obj.prio}
                  </span>
                  <span className="font-semibold transition-colors">{optionName}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 flex justify-end">
        <div className="w-full flex justify-between gap-4">
          <div className="modal-button-container flex items-center gap-2 sm:gap-3 justify-start">
            <ResponsiveButton
              size="small"
              onClick={() => setShowAlert(false)}
              disabled={showSpinner}
              variant="outline"
            >
              zurück
            </ResponsiveButton>
          </div>
          <div className="modal-button-container flex items-center gap-2 sm:gap-3 justify-end">
            <ResponsiveButton
              disabled={showSpinner}
              onClick={() => {
                handleOnSubmit();
              }}
              size="small"
              variant="primary"
              className="rounded-lg px-4 py-2 transition flex items-center gap-2"
            >
              {showSpinner ? (
                <Spinner size={18} thickness={3} color="border-white" />
              ) : (
                theme.text.confirmVote
              )}
            </ResponsiveButton>
          </div>
        </div>
      </div>
    </div>
  );
};
