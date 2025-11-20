import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { useEffect, useState } from 'react';
import { voterApi } from '../services/voterApi';
import ResponsiveButton from './ResponsiveButton';
import { Alert } from './Alert';

export const Modal = ({ open, setOpen, electionId }) => {
  const [election, setElection] = useState([]);
  const [showAlert, setShowAlert] = useState(false);
  useEffect(() => {
    if (!electionId) {
      return;
    }
    const fetchCandidates = async () => {
      const response = await voterApi.getElectionById(electionId);
      setElection(response);
    };
    fetchCandidates();
  }, [electionId]);
  return (
    <Dialog open={open} onClose={setOpen} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity
        data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
      />

      <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto">
        <DialogPanel
          transition
          className="
        w-full
        max-w-full sm:max-w-2xl md:max-w-4xl
        h-[90vh]
        bg-gray-800
        rounded-xl
        shadow-2xl
        outline outline-white/10
        overflow-hidden
        flex flex-col
        transition-all
        data-closed:opacity-0 data-closed:scale-95
        data-enter:duration-300 data-enter:ease-out
        data-leave:duration-200 data-leave:ease-in
      "
        >
          {showAlert && (
            <div className="fixed inset-0 flex items-center justify-center z-[9999] rounded-md">
              <Alert setShowAlert={setShowAlert} />
            </div>
          )}
          {/* Header */}
          <div className="px-4 sm:px-6 py-4 border-b border-gray-700">
            <DialogTitle className="text-lg sm:text-xl md:text-2xl font-bold text-white truncate">
              {election.info} - Wahlprozess
            </DialogTitle>
          </div>

          {/* Number of votes */}
          <div className="px-4 sm:px-6 py-2 border-b border-gray-700">
            <DialogTitle className="text-sm sm:text-md font-bold text-white">
              Sie haben {election.votes_per_ballot} Stimme/n und können maximal x auf eine Person
              kumulieren.
            </DialogTitle>
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-2">
            <div className="rounded-lg border border-gray-700 overflow-hidden mt-2 mx-2">
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
              <div className="divide-y divide-gray-700 bg-gray-900/40">
                {election?.candidates?.length > 0 ? (
                  election.candidates.map((cand) => (
                    <div
                      key={cand.candidateId}
                      className="
                        grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-0 items-center
                        px-3 py-3 sm:px-4 sm:py-3
                        hover:bg-gray-800/40 transition
                      "
                    >
                      {/* Nr. */}
                      <div>
                        <div className="sm:hidden text-xs text-gray-400 mb-1">Nr.</div>
                        <div className="text-gray-200 text-sm">{cand.listnum}</div>
                      </div>

                      {/* Schlagwort */}
                      <div>
                        <div className="sm:hidden text-xs text-gray-400 mb-1">Schlagwort</div>
                        <div className="text-gray-200 text-sm sm:px-1">{cand.keyword}</div>
                      </div>

                      {/* Kandidat*in */}
                      <div>
                        <div className="sm:hidden text-xs text-gray-400 mb-1">Kandidat*in</div>
                        <div className="text-gray-200 text-sm sm:px-3">
                          {cand.firstname} {cand.lastname}
                        </div>
                      </div>

                      {/* Stimmen (input) */}
                      <div className="text-right">
                        <div className="sm:hidden text-xs text-gray-400 mb-1">Stimmen</div>
                        <input
                          type="number"
                          min={0}
                          max={election.votes_per_ballot}
                          aria-label={`Stimmen für ${cand.firstname} ${cand.lastname}`}
                          className="
                            mx-auto sm:mx-0
                            w-16 sm:w-18
                            rounded-md bg-gray-800 border border-gray-600
                            text-gray-200 px-2 py-1 text-sm
                            focus:ring-2 focus:ring-blue-500 focus:outline-none
                          "
                          defaultValue={0}
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
          <div className="px-4 sm:px-6 py-4 border-t border-gray-700 flex items-center justify-between">
            <label className="flex items-center gap-3 text-white cursor-pointer">
              <input type="checkbox" className="w-5 h-5 " />
              <span>Ich möchte die Wahl ungültig abgeben!</span>
            </label>

            <div className="flex items-center gap-3">
              <ResponsiveButton
                className="text-white"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </ResponsiveButton>

              <ResponsiveButton onClick={() => setShowAlert(true)} variant="primary">
                Abstimmung speichern
              </ResponsiveButton>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};
