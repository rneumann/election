import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { useEffect, useState, useContext } from 'react';
import log from 'loglevel';
import { voterApi } from '../services/voterApi';
import { logger } from '../conf/logger/logger';
import { AccessibilityContext } from '../context/AccessibilityContext';
import ResponsiveButton from './ResponsiveButton';
import { Alert } from './Alert';

export const Modal = ({ open, setOpen, electionId, refreshElections }) => {
  const [election, setElection] = useState(undefined);
  const [showAlert, setShowAlert] = useState(false);
  const [votes, setVotes] = useState({});
  const [cleanedVotesPreview, setCleanedVotesPreview] = useState(undefined);
  const [votesLeft, setVotesLeft] = useState(0);
  const [saveButtonDisabled, setSaveButtonDisabled] = useState(true);
  const [invalidHandOver, setInvalidHandOver] = useState(false);
  const { settings } = useContext(AccessibilityContext);

  // Build accessibility classes for modal content
  const accessibilityClasses = [
    settings.lineHeight === 1 ? 'accessibility-line-height-1' : '',
    settings.lineHeight === 1.3 ? 'accessibility-line-height-1-3' : '',
    settings.lineHeight === 1.6 ? 'accessibility-line-height-1-6' : '',
  ]
    .filter(Boolean)
    .join(' ');

  useEffect(() => {
    if (!open) {
      return;
    }

    const html = document.documentElement;

    // This preserves Tailwind responsive breakpoints while scaling text
    html.setAttribute('data-text-scale', settings.textSize.toString());
  }, [open, settings]);

  const handleSubmit = () => {
    const cleanedVotes = invalidHandOver
      ? undefined
      : Object.fromEntries(Object.entries(votes).filter(([key, value]) => value > 0)); // eslint-disable-line

    setCleanedVotesPreview(cleanedVotes);
    setShowAlert(true);

    log.debug(`cleanedVotes: ${JSON.stringify(cleanedVotes)}`);
  };

  const onCancel = () => {
    setVotes({});
    setVotesLeft(election?.votes_per_ballot);
    setInvalidHandOver(false);
    setOpen(false);
  };

  useEffect(() => {
    if (!electionId) {
      return;
    }
    const fetchCandidates = async () => {
      const response = await voterApi.getElectionById(electionId);
      setElection(response);
      logger.debug(`getElectionById res: ${JSON.stringify(response)}`);
      logger.debug(`votes per ballot: ${response.votes_per_ballot}`);
      setVotesLeft(response.votes_per_ballot || 0);

      const initialVotes = {};
      response.candidates.forEach((candidate) => {
        initialVotes[candidate.id] = 0;
      });
      setVotes(initialVotes);
    };
    fetchCandidates();
  }, [electionId]);

  useEffect(() => {
    const validCheck = () => {
      if (!election?.max_cumulative_votes) {
        return;
      }

      const hasTooManyForOneCandidate = Object.values(votes).some(
        (v) => v > election.max_cumulative_votes,
      );

      const noVotesLeft = votesLeft === 0;

      const valid = (noVotesLeft && !hasTooManyForOneCandidate) || invalidHandOver;

      valid;
      setSaveButtonDisabled(!valid);
    };

    validCheck();
  }, [votes, votesLeft, election, invalidHandOver]);

  return (
    <Dialog open={open} onClose={() => {}} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity
        data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
      />

      <div className="fixed inset-0 flex items-start justify-center p-4 overflow-y-auto">
        <DialogPanel
          transition
          className={`
            w-full max-w-full sm:max-w-2xl md:max-w-4xl
            h-[90vh] my-4
            bg-white dark:bg-gray-800
            border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl
            flex flex-col overflow-hidden
            transition-all
            data-closed:opacity-0 data-closed:scale-95
            data-enter:duration-300 data-enter:ease-out
            data-leave:duration-200 data-leave:ease-in
            modal-content
            ${accessibilityClasses}
          `}
        >
          {/* Alert */}
          {showAlert && (
            <div className="fixed inset-0 flex items-center justify-center z-[9999] rounded-md">
              <Alert
                setShowAlert={setShowAlert}
                cleanedVotes={cleanedVotesPreview}
                candidates={election.candidates}
                election={election}
                invalidHandOver={invalidHandOver}
                onCancel={onCancel}
                refreshElections={refreshElections}
              />
            </div>
          )}

          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 transition-colors">
            <DialogTitle className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate transition-colors">
              {election?.info} - Wahlprozess
            </DialogTitle>
          </div>

          {/* Number of votes */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex flex-col gap-2 transition-colors">
            <span className="text-sm sm:text-md font-bold text-gray-900 dark:text-gray-100 transition-colors">
              Sie haben {election?.votes_per_ballot} Stimme/n und können maximal{' '}
              {election?.max_cumulative_votes} auf eine Person kumulieren.
            </span>
            <span
              className={`
                text-sm sm:text-md font-bold flex flex-wrap transition-colors
                ${votesLeft > 0 ? 'text-green-400 dark:text-green-500' : 'text-red-400 dark:text-red-500'}
              `}
            >
              Stimmen übrig: {votesLeft}
            </span>
          </div>

          {/* Candidates list */}
          <div className="flex-1 overflow-y-auto px-3 py-3 bg-white dark:bg-gray-800 transition-colors">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden mt-2 mx-2 bg-white dark:bg-gray-800 transition-colors">
              {/* Header - only visible on sm+ */}
              <div
                className="
                  hidden sm:grid sm:grid-cols-4
                  bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold uppercase tracking-wider transition-colors
                "
              >
                <div className="px-3 py-2">Nr.</div>
                <div className="px-3 py-2">Schlagwort</div>
                <div className="px-3 py-2">Kandidat*in</div>
                <div className="px-3 py-2 text-right">Stimmen</div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-gray-200 dark:divide-gray-700 transition-colors">
                {election?.candidates?.length > 0 ? (
                  election.candidates.map((cand) => (
                    <div
                      key={cand.candidateId}
                      className="
                        grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-0
                        px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                        rounded-lg sm:rounded-none
                      "
                    >
                      {/* Nr. */}
                      <div>
                        <div className="sm:hidden text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1 transition-colors">
                          Nr.
                        </div>
                        <div className="text-gray-900 dark:text-gray-100 text-sm transition-colors">
                          {cand.listnum}
                        </div>
                      </div>

                      {/* Keyword */}
                      <div>
                        <div className="sm:hidden text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1 transition-colors">
                          Schlagwort
                        </div>
                        <div className="text-gray-900 dark:text-gray-100 text-sm sm:px-1 transition-colors">
                          {cand.keyword}
                        </div>
                      </div>

                      {/* Candidates */}
                      <div>
                        <div className="sm:hidden text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1 transition-colors">
                          Kandidat*in
                        </div>
                        <div className="text-gray-900 dark:text-gray-100 text-sm sm:px-3 transition-colors">
                          {cand.firstname} {cand.lastname}
                        </div>
                      </div>

                      {/* Votes (input) */}
                      <div className="text-right">
                        <div className="sm:hidden text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1 transition-colors">
                          Stimmen
                        </div>
                        <input
                          type="number"
                          min={0}
                          max={election.max_cumulative_votes}
                          aria-label={`Stimmen für ${cand.firstname} ${cand.lastname}`}
                          value={votes[cand.listnum] ?? 0}
                          className="
                            mx-auto sm:mx-0
                            w-20
                            rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600
                            text-gray-900 dark:text-gray-100 px-2 py-1 text-sm
                            focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 focus:border-blue-400 dark:focus:border-blue-500 transition-colors
                          "
                          onChange={(e) => {
                            logger.debug(`onChange: ${e.target.value}`);
                            const newValue = Number(e.target.value);
                            const oldValue = Number(votes[cand.listnum] || 0);
                            if (newValue < 0 || newValue > election.max_cumulative_votes) {
                              logger.debug(`invalid value: ${e.target.value}`);
                              return;
                            }
                            if (votesLeft <= 0 && newValue > oldValue) {
                              logger.debug(`you reached your votes limit: ${e.target.value}`);
                              e.target.value = oldValue;
                              return;
                            }

                            setVotes((prevVotes) => ({
                              ...prevVotes,
                              [cand.listnum]: newValue,
                            }));

                            setVotesLeft((prevVotesLeft) => prevVotesLeft - (newValue - oldValue));
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="mt-4 px-3 py-3 text-gray-900">Keine Kandidaten vorhanden!</div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-colors">
            <label className="flex items-center gap-3 text-gray-900 dark:text-gray-100 cursor-pointer transition-colors">
              <input
                type="checkbox"
                className="w-5 h-5"
                checked={invalidHandOver}
                onChange={(e) => setInvalidHandOver(e.target.checked)}
              />
              <span>Ich möchte meinen Stimmzettel ungültig abgeben!</span>
            </label>

            <div className="modal-button-container flex items-center gap-2 sm:gap-3 justify-end">
              <ResponsiveButton
                size="small"
                variant="outline"
                disabled={showAlert}
                onClick={() => {
                  onCancel();
                }}
              >
                Cancel
              </ResponsiveButton>

              <ResponsiveButton
                size="small"
                disabled={showAlert}
                onClick={() => {
                  setVotes({});
                  log.warn(
                    `Votes reset: ${JSON.stringify(votes)}, votesperballot: ${election?.votes_per_ballot}`,
                  );
                  setVotesLeft(election?.votes_per_ballot);
                  setInvalidHandOver(false);
                }}
                variant="primary"
              >
                Zurücksetzen
              </ResponsiveButton>

              <ResponsiveButton
                disabled={saveButtonDisabled || showAlert}
                size="small"
                type="submit"
                variant="primary"
                onClick={handleSubmit}
              >
                Abstimmung speichern
              </ResponsiveButton>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};
