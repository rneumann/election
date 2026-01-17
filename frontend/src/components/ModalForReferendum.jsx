import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { useEffect, useState, useContext } from 'react';
import { voterApi } from '../services/voterApi';
import { AccessibilityContext } from '../context/AccessibilityContext';
import { candidateApi } from '../services/candidateApi';
import { logger } from '../conf/logger/logger';
import { useTheme } from '../hooks/useTheme';
import ResponsiveButton from './ResponsiveButton';
import { AlertForReferendum } from './AlertForReferendum';
const MAX_UID_PREFIX_LENGTH = 20;

export const ModalForReferendum = ({ open, setOpen, electionId, refreshElections }) => {
  const [election, setElection] = useState(undefined);
  const [options, setOptions] = useState([]);
  const [showAlert, setShowAlert] = useState(false);
  const [cleanedVotesPreview, setCleanedVotesPreview] = useState(undefined);
  const [invalidHandOver, setInvalidHandOver] = useState(false);
  const [selectedOptionValues, setSelectedOptionValues] = useState([]);
  const [optionsCount, setOptionsCount] = useState(0);
  const { settings } = useContext(AccessibilityContext);
  const theme = useTheme();

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
    html.setAttribute('data-text-scale', settings.textSize.toString());
  }, [open, settings]);
  const handleSubmit = async () => {
    logger.debug(`selectedOptionValues: ${JSON.stringify(selectedOptionValues)}`);

    if (invalidHandOver) {
      const cleanedVotes = { invalid: true };
      logger.debug(`infoData: ${JSON.stringify(cleanedVotes)}`);
      setCleanedVotesPreview(cleanedVotes);
      setShowAlert(true);
      return;
    }

    const uidNr = [...selectedOptionValues]
      .sort((a, b) => a.prio - b.prio)
      .map((obj) => obj.value)
      .join(',');

    const uid = `${election.description
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, MAX_UID_PREFIX_LENGTH)}_${uidNr}`;

    const listNum = await candidateApi.getOptionListNum(uid, electionId);

    const cleanedVotes = {
      listnum: listNum,
      votes: 1,
    };

    logger.debug(`infoData: ${JSON.stringify(cleanedVotes)}`);
    setCleanedVotesPreview(cleanedVotes);
    setShowAlert(true);
  };

  const onCancel = () => {
    setSelectedOptionValues(
      Array.from({ length: optionsCount }, (_, index) => ({ prio: index + 1, value: 'nothing' })),
    );
    setInvalidHandOver(false);
    setOpen(false);
  };

  useEffect(() => {
    if (!electionId) {
      return;
    }

    const fetchOptions = async () => {
      try {
        const response = await voterApi.getElectionById(electionId);
        setElection(response);

        const optionsRes = await candidateApi.getOptionsForElection(electionId);
        setOptions(optionsRes);

        const count =
          (response?.candidates &&
            response.candidates[0] &&
            String(response.candidates[0].uid).includes('_') &&
            response.candidates[0].uid.split('_')[1].split(',').length) ||
          0;
        setOptionsCount(count);

        setSelectedOptionValues(
          Array.from({ length: count }, (_, index) => ({
            prio: index + 1,
            value: 'nothing',
          })),
        );
      } catch (err) {
        logger.error('Fehler beim Laden der Optionen:', err);
      }
    };

    fetchOptions();
  }, [electionId, open]);

  const isSaveDisabled =
    showAlert ||
    (!invalidHandOver &&
      (selectedOptionValues.length < optionsCount ||
        selectedOptionValues.some((obj) => obj.value === 'nothing') ||
        selectedOptionValues.some((obj, index) => {
          const currentOption = options.find((opt) => String(opt.nr) === String(obj.value));
          const isEnthaltung = currentOption?.name === 'Enthaltung';

          if (!isEnthaltung) {
            const isDuplicate =
              selectedOptionValues.findIndex(
                (other, otherIndex) =>
                  String(other.value) === String(obj.value) && otherIndex !== index,
              ) !== -1;
            if (isDuplicate) {
              return true;
            }
          }
          if (!isEnthaltung && index > 0) {
            const previousValues = selectedOptionValues.slice(0, index);
            const hasPreviousEnthaltung = previousValues.some((prevObj) => {
              const prevOpt = options.find((opt) => String(opt.nr) === String(prevObj.value));
              return prevOpt?.name === 'Enthaltung';
            });

            if (hasPreviousEnthaltung) {
              return true;
            }
          }

          return false;
        })));

  return (
    <Dialog open={open} onClose={() => {}} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity data-closed:opacity-0 data-enter:duration-300 data-leave:duration-200"
      />

      <div className="fixed inset-0 flex items-center justify-center p-4 sm:p-6">
        <DialogPanel
          transition
          className={`
            w-full max-w-4xl max-h-[95vh]
            bg-white dark:bg-gray-900 
            rounded-2xl shadow-2xl 
            flex flex-col overflow-hidden border border-gray-100 dark:border-gray-800
            transition-all data-closed:opacity-0 data-closed:scale-95
            ${accessibilityClasses}
          `}
        >
          {/* Alert Overlay */}
          {showAlert && (
            <div className="absolute inset-0 z-[9999] flex items-center justify-center bg-black/20 backdrop-blur-sm px-4">
              <AlertForReferendum
                setShowAlert={setShowAlert}
                cleanedVotes={cleanedVotesPreview}
                candidates={election.candidates}
                selectedOptionValues={selectedOptionValues}
                election={election}
                invalidHandOver={invalidHandOver}
                onCancel={onCancel}
                refreshElections={refreshElections}
                options={options}
              />
            </div>
          )}

          {/* Header */}
          <div className="px-6 py-5 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border-b border-gray-100 dark:border-gray-800">
            <DialogTitle className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
              <span className="truncate">{election?.info || 'Wahlprozess'}</span>
            </DialogTitle>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Instruction Card */}
            <div className="flex gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
                />
              </svg>

              <p className="text-sm leading-relaxed text-blue-800 dark:text-blue-200 font-medium">
                Sie können Ihre Stimmenabgabe über die Drop-Down Felder vollziehen. Dabei kann für
                jede Option maximal eine Stimme abgegeben werden.
              </p>
            </div>

            {/* Selection Grid */}
            <div
              className={
                optionsCount === 1
                  ? 'flex justify-center w-full'
                  : 'grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6'
              }
            >
              {options?.length > 0 ? (
                Array.from({ length: optionsCount }).map((_, index) => (
                  <div
                    key={index}
                    className={`group flex flex-col p-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all shadow-sm ${
                      optionsCount === 1 ? 'w-full' : ''
                    }`}
                  >
                    <label
                      className={`text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 ${
                        optionsCount === 1 ? 'text-center' : ''
                      }`}
                    >
                      {optionsCount === 1 ? 'Ihre Wahl' : `${index + 1}. Stimme`}
                    </label>
                    <div className="relative">
                      {' '}
                      {/* Wichtig: relative auf dem direkten Wrapper */}
                      <select
                        value={selectedOptionValues[index]?.value ?? 'nothing'} // eslint-disable-line
                        onChange={(e) => {
                          const newValue = e.target.value;
                          setSelectedOptionValues((prevValues) => {
                            /* eslint-disable */
                            const base = prevValues.length
                              ? prevValues
                              : Array.from({ length: optionsCount }, (_, i) => ({
                                  prio: i + 1,
                                  value: 'nothing',
                                }));
                            const updated = base.map((obj, i) =>
                              i === index ? { ...obj, prio: index + 1, value: newValue } : obj,
                            );
                            logger.debug(
                              `updated selectedOptionValues: ${JSON.stringify(updated)}`,
                            );
                            return updated;
                          });
                        }}
                        className="w-full pl-4 pr-10 py-3 bg-gray-50 dark:bg-gray-700 border-0 rounded-lg text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-600 focus:ring-2 focus:ring-brand-primary transition-all appearance-none cursor-pointer sm:text-sm shadow-sm hover:bg-gray-100 dark:hover:bg-gray-600"
                      >
                        <option value="nothing">--- Bitte wählen ---</option>
                        {options.map((opt) => (
                          <option key={opt.nr} value={opt.nr}>
                            {opt.name}
                          </option>
                        ))}
                      </select>
                      {/* Das Icon-Container: Absolut rechts positioniert */}
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <svg
                          className="h-5 w-5 text-gray-400 group-hover:text-gray-500 transition-colors"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-12 text-center text-gray-500 italic">
                  Keine Kandidaten vorhanden!
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-5 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <label className="relative flex items-center group cursor-pointer">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-gray-300 text-brand-primary focus:ring-brand-primary transition-all cursor-pointer"
                  checked={invalidHandOver}
                  onChange={(e) => setInvalidHandOver(e.target.checked)}
                />
              </div>
              <div className="ml-3 text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-300 group-hover:text-brand-primary transition-colors">
                  {theme.placeholders.checkBoxConfirm}
                </span>
              </div>
            </label>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-end">
              <ResponsiveButton
                size="small"
                variant="outline"
                disabled={showAlert}
                onClick={onCancel}
                className="w-full sm:w-auto"
              >
                Abbrechen
              </ResponsiveButton>

              <ResponsiveButton
                size="small"
                disabled={showAlert}
                onClick={() => {
                  setSelectedOptionValues(
                    Array.from({ length: optionsCount }, () => ({ value: 'nothing' })),
                  );
                  setInvalidHandOver(false);
                }}
                variant="outline"
                className="w-full sm:w-auto"
              >
                Zurücksetzen
              </ResponsiveButton>

              <ResponsiveButton
                disabled={isSaveDisabled}
                size="small"
                type="submit"
                variant="primary"
                onClick={handleSubmit}
                className="shadow-lg shadow-brand-primary/20 w-full sm:w-auto"
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
