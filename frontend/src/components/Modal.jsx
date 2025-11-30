import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { useEffect, useState } from 'react';
import log from 'loglevel';
import { voterApi } from '../services/voterApi';
import { logger } from '../conf/logger/logger';
import ResponsiveButton from './ResponsiveButton';
import { Alert } from './Alert';

export const Modal = ({ open, setOpen, electionId }) => {
  const [election, setElection] = useState(undefined);
  const [showAlert, setShowAlert] = useState(false);
  const [votes, setVotes] = useState({});
  const [cleanedVotesPreview, setCleanedVotesPreview] = useState(undefined);
  const [votesLeft, setVotesLeft] = useState(0);
  const [saveButtonDisabled, setSaveButtonDisabled] = useState(true);
  const [invalidHandOver, setInvalidHandOver] = useState(false);

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

      <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto">
        <DialogPanel
          transition
          className="
            w-full max-w-full sm:max-w-2xl md:max-w-4xl
            h-[90vh]
            bg-gray-900/90 backdrop-blur-xl
            border border-white/10 rounded-2xl shadow-xl
            flex flex-col overflow-hidden
            transition-all
            data-closed:opacity-0 data-closed:scale-95
            data-enter:duration-300 data-enter:ease-out
            data-leave:duration-200 data-leave:ease-in
          "
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
              />
            </div>
          )}

          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-700 bg-gray-800/40 backdrop-blur-sm">
            <DialogTitle className="text-lg sm:text-xl md:text-2xl font-bold text-white truncate">
              {election?.info} - Wahlprozess
            </DialogTitle>
          </div>

          {/* Number of votes */}
          <div className="px-6 py-4 border-b border-gray-700 bg-gray-800/40 flex flex-col gap-2">
            <span className="text-sm sm:text-md font-bold text-white">
              Sie haben {election?.votes_per_ballot} Stimme/n und können maximal{' '}
              {election?.max_cumulative_votes} auf eine Person kumulieren.
            </span>
            <span
              className={`
                text-sm sm:text-md font-bold flex flex-wrap
                ${votesLeft > 0 ? 'text-green-400' : 'text-red-400'}
              `}
            >
              Stimmen übrig: {votesLeft}
            </span>
          </div>

          {/* Candidates list */}
          <div className="flex-1 overflow-y-auto px-3 py-3 bg-gray-800/40">
            <div className="rounded-xl border border-gray-700 overflow-hidden mt-2 mx-2 bg-gray-800/40">
              {/* Header - only visible on sm+ */}
              <div
                className="
                  hidden sm:grid sm:grid-cols-4
                  bg-gray-800 text-gray-300 text-xs font-semibold uppercase tracking-wider
                "
              >
                <div className="px-3 py-2">Nr.</div>
                <div className="px-3 py-2">Schlagwort</div>
                <div className="px-3 py-2">Kandidat*in</div>
                <div className="px-3 py-2 text-right">Stimmen</div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-gray-700">
                {election?.candidates?.length > 0 ? (
                  election.candidates.map((cand) => (
                    <div
                      key={cand.candidateId}
                      className="
                        grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-0
                        px-4 py-4 hover:bg-gray-800/40 transition
                        rounded-lg sm:rounded-none
                      "
                    >
                      {/* Nr. */}
                      <div>
                        <div className="sm:hidden text-[10px] uppercase tracking-wide text-gray-400 mb-1">
                          Nr.
                        </div>
                        <div className="text-gray-200 text-sm">{cand.listnum}</div>
                      </div>

                      {/* Keyword */}
                      <div>
                        <div className="sm:hidden text-[10px] uppercase tracking-wide text-gray-400 mb-1">
                          Schlagwort
                        </div>
                        <div className="text-gray-200 text-sm sm:px-1">{cand.keyword}</div>
                      </div>

                      {/* Candidates */}
                      <div>
                        <div className="sm:hidden text-[10px] uppercase tracking-wide text-gray-400 mb-1">
                          Kandidat*in
                        </div>
                        <div className="text-gray-200 text-sm sm:px-3">
                          {cand.firstname} {cand.lastname}
                        </div>
                      </div>

                      {/* Votes (input) */}
                      <div className="text-right">
                        <div className="sm:hidden text-[10px] uppercase tracking-wide text-gray-400 mb-1">
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
                            rounded-lg bg-gray-800/80 border border-gray-600/60
                            text-gray-200 px-2 py-1 text-sm
                            focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition
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
                  <div className="mt-4 px-3 py-3 text-white">Keine Kandidaten vorhanden!</div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-700 bg-gray-900/80 backdrop-blur-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <label className="flex items-center gap-3 text-white cursor-pointer">
              <input
                type="checkbox"
                className="w-5 h-5"
                checked={invalidHandOver}
                onChange={(e) => setInvalidHandOver(e.target.checked)}
              />
              <span>Ich möchte die Wahl ungültig abgeben!</span>
            </label>

            <div className="flex items-center gap-2 sm:gap-3 justify-end">
              <ResponsiveButton
                size="small"
                className="text-white"
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
