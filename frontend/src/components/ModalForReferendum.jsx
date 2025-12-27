import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { useEffect, useState, useContext } from 'react';
import log from 'loglevel';
import { voterApi } from '../services/voterApi';
import { logger } from '../conf/logger/logger';
import { AccessibilityContext } from '../context/AccessibilityContext';
import { candidateApi } from '../services/candidateApi';
import ResponsiveButton from './ResponsiveButton';
import { Alert } from './Alert';

export const ModalForReferendum = ({ open, setOpen, electionId, refreshElections }) => {
  const [election, setElection] = useState(undefined);
  const [options, setOptions] = useState([]);
  const [showAlert, setShowAlert] = useState(false);
  const [cleanedVotesPreview, setCleanedVotesPreview] = useState(undefined);
  const [saveButtonDisabled, setSaveButtonDisabled] = useState(true);
  const [invalidHandOver, setInvalidHandOver] = useState(false);
  const [selectedOptionValues, setSelectedOptionValues] = useState([]);
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

  const handleSubmit = () => {};

  const onCancel = () => {
    setSelectedOptionValues([]);
    setInvalidHandOver(false);
    setOpen(false);
  };

  useEffect(() => {
    if (!electionId) {
      return;
    }
    const fetchOptions = async () => {
      const response = await voterApi.getElectionById(electionId);
      setElection(response);
      logger.debug(`getElectionById res: ${JSON.stringify(response)}`);
      const optionsRes = await candidateApi.getOptionsForElection(electionId);
      logger.debug(`getOptionsForElection res: ${JSON.stringify(optionsRes)}`);
      setOptions(optionsRes);
    };
    fetchOptions();
  }, [electionId]);

  useEffect(() => {
    const validCheck = () => {
      // duplicate check for selected values!
      if (
        selectedOptionValues.filter(
          (item, index) => item !== 'enthaltung' && selectedOptionValues.indexOf(item) !== index,
        ).length > 0
      ) {
        logger.debug('duplicate values found');
      }
    };

    validCheck();
  }, []);

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
              Sie können Ihre stimmenabgabe über das Drop-Down Feld vollziehen. Dabei kann für jede
              Option max eine Stimme abgegeben werden.
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
                {options?.length === 1 ? (
                  <div className="px-3 py-2">Option</div>
                ) : (
                  options.map((_, index) => (
                    <div key={index} className="px-3 py-2">
                      Priorität {index + 1}
                    </div>
                  ))
                )}
              </div>

              {/* Rows */}
              <div className="divide-y divide-gray-200 dark:divide-gray-700 transition-colors">
                {options?.length > 0 ? (
                  <div
                    className="
                      flex items-center justify-between sm:grid sm:grid-cols-4 
                      gap-3 sm:gap-0 px-4 py-3 sm:py-4 
                      hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                    "
                  >
                    {/* Info-Block: Nr, Schlagwort & Name gruppiert auf Mobile */}
                    <div className="flex items-center gap-3 sm:contents">
                      {/* Nr. */}
                      <div className="flex flex-col sm:block min-w-[2rem]">
                        <div className="sm:hidden text-[10px] uppercase text-gray-500 dark:text-gray-400">
                          Nr.
                        </div>
                        <div className="text-gray-900 dark:text-gray-100 text-sm font-medium sm:font-normal"></div>
                      </div>

                      {options.map((_, index) => (
                        <div className="flex flex-col sm:contents" key={index}>
                          <div className="sm:hidden text-[10px] uppercase text-gray-500 dark:text-gray-400">
                            Priorität {index + 1}
                          </div>
                          <div className="text-gray-900 dark:text-gray-100 text-sm font-semibold sm:font-normal sm:px-3">
                            <select
                              id="option-select"
                              value={selectedOptionValues[index]} // eslint-disable-line
                              onChange={(e) => {
                                logger.debug(`Selected election for deletion: ${e.target.value}`);
                                setSelectedOptionValues(
                                  selectedOptionValues.map((value, i) =>
                                    i === index ? e.target.value : value,
                                  ),
                                );
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                            >
                              <option key="all" value="all">
                                --- Bitte wählen ---
                              </option>
                              {options.map((opt) => (
                                <option key={opt.nr} value={opt.name}>
                                  {opt.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
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
                  setSelectedOptionValues([]);
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
