import { useState } from 'react';
import { logger } from '../conf/logger/logger';
import { voterApi } from '../services/voterApi';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import ResponsiveButton from './ResponsiveButton';
import { Spinner } from './Spinner';

export const Alert = ({
  setShowAlert,
  cleanedVotes,
  candidates,
  election,
  invalidHandOver,
  onCancel,
  refreshElections,
}) => {
  const [showSpinner, setShowSpinner] = useState(false);
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const resolveName = (listnum) => {
    const cand = candidates?.find((c) => c.listnum === Number(listnum));
    if (!cand) {
      logger.error(`Candidate with listnum ${listnum} not found`);
      return listnum;
    }
    return `${cand.firstname} ${cand.lastname}`;
  };

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
        voteDecision: Object.entries(cleanedVotes ?? {}).map(([listnum, value]) => ({
          listnum: Number(listnum),
          votes: value,
        })),
      };

      const res = await createBallot(data);

      if (!res) {
        showAlert('error', 'Fehler beim Erstellen der Wahl... Bitte versuchen Sie es erneut.');
        return;
      }

      showAlert('success', 'Wahl erfolgreich erstellt');
      await refreshElections();
    } catch {
      showAlert('error', 'Unerwarteter Fehler');
    } finally {
      setShowSpinner(false);
      setShowAlert(false);
      onCancel();
    }
  };

  return (
    <div className="bg-gray-900/95 backdrop-blur-md text-center py-4 px-6 rounded-3xl w-96 h-96 flex flex-col shadow-2xl border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="font-bold text-white text-lg">Ihre Auswahl zur Kontrolle</span>
        <ResponsiveButton
          disabled={showSpinner}
          onClick={() => setShowAlert(false)}
          size="icon"
          variant="icon"
          className="text-gray-400 hover:text-red-500 transition"
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
        {cleanedVotes === undefined ? (
          <p className="text-red-500 font-bold">Ihr Stimmzettel wird ungültig abgegeben!</p>
        ) : Object.keys(cleanedVotes).length === 0 ? (
          <p className="text-gray-300">Keine Stimmen vergeben.</p>
        ) : (
          <ul className="space-y-3">
            {Object.entries(cleanedVotes).map(([listnum, value]) => (
              <li
                key={listnum}
                className="bg-gray-800 text-white rounded-xl p-3 flex justify-between items-center shadow hover:shadow-lg transition"
              >
                <span className="font-semibold">{resolveName(listnum)}</span>
                <span className="bg-blue-600 text-white rounded-full px-3 py-1 text-sm font-medium">
                  {value} Stimme{value > 1 ? 'n' : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 flex justify-end">
        <div className="w-full flex justify-between">
          <div className="flex items-center gap-2 sm:gap-3 justify-start">
            <ResponsiveButton
              size="small"
              onClick={() => setShowAlert(false)}
              disabled={showSpinner}
              className="text-white"
              variant="outline"
            >
              zurück
            </ResponsiveButton>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 justify-end">
            <ResponsiveButton
              disabled={showSpinner}
              onClick={() => {
                handleOnSubmit();
              }}
              size="small"
              className="text-white rounded-lg px-4 py-2 transition flex items-center gap-2"
            >
              {showSpinner ? (
                <Spinner size={18} thickness={3} color="border-white" />
              ) : (
                'Abstimmung bestätigen'
              )}
            </ResponsiveButton>
          </div>
        </div>
      </div>
    </div>
  );
};
