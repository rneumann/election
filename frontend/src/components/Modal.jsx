import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { useEffect, useState, useContext } from 'react';
import log from 'loglevel';
import { voterApi } from '../services/voterApi';
import { useTheme } from '../hooks/useTheme';
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
  const [freeSlots, setFreeSlots] = useState([]);
  const [freeSlotsPreview, setFreeSlotsPreview] = useState([]);
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupResults, setLookupResults] = useState([]);
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const { settings } = useContext(AccessibilityContext);
  const theme = useTheme();

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
    setFreeSlotsPreview(invalidHandOver ? [] : freeSlots.filter((s) => s.votes > 0));
    setShowAlert(true);

    log.debug(`cleanedVotes: ${JSON.stringify(cleanedVotes)}`);
  };

  const handleLookup = async () => {
    if (lookupQuery.trim().length < 2) return;
    setLookupError('');
    setLookupResult(null);
    setLookupResults([]);
    setLookupLoading(true);
    try {
      const res = await voterApi.searchVotersByName(lookupQuery.trim(), electionId);
      if (res.status === 200) {
        if (res.data.length === 0) {
          setLookupError('Keine Person gefunden.');
        } else {
          setLookupResults(res.data);
        }
      }
    } catch (err) {
      setLookupError('Fehler bei der Suche.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSelectSearchResult = (voter) => {
    if (voter.isFixedCandidate) {
      setLookupError('Person ist bereits fester Kandidat – bitte über die Liste oben wählen.');
      return;
    }
    const alreadyAdded = freeSlots.some((s) => s.voterUid === voter.uid);
    if (alreadyAdded) {
      setLookupError('Diese Person wurde bereits hinzugefügt.');
      return;
    }
    // uid → voterUid normalisieren damit Alert.jsx und removeFreeSlot korrekt arbeiten
    setLookupResult({ ...voter, voterUid: voter.uid });
    setLookupResults([]);
    setLookupQuery('');
    setLookupError('');
  };

  const confirmFreeSlot = () => {
    if (!lookupResult) return;
    if (freeSlots.length >= (election?.free_slots ?? 0)) return;
    setFreeSlots((prev) => [...prev, { ...lookupResult, votes: 1 }]);
    setVotesLeft((prev) => prev - 1);
    setLookupUid('');
    setLookupResult(null);
  };

  const removeFreeSlot = (uid) => {
    const slot = freeSlots.find((s) => s.voterUid === uid);
    if (slot) setVotesLeft((prev) => prev + slot.votes);
    setFreeSlots((prev) => prev.filter((s) => s.voterUid !== uid));
  };

  const onCancel = () => {
    setVotes({});
    setFreeSlots([]);
    setLookupQuery('');
    setLookupResults([]);
    setLookupResult(null);
    setLookupError('');
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
        initialVotes[candidate.listnum] = 0;
      });
      setVotes(initialVotes);
    };
    fetchCandidates();
  }, [electionId]);

  useEffect(() => {
    const validCheck = () => {
      if (!election) return;

      const fixedVoteCounts = Object.values(votes);
      const freeVoteCounts = freeSlots.map((s) => s.votes);
      const allVoteCounts = [...fixedVoteCounts, ...freeVoteCounts];
      const totalCast = allVoteCounts.reduce((sum, v) => sum + v, 0);
      const atLeastOneVote = totalCast > 0;

      let valid;
      if (election.max_cumulative_votes > 1) {
        // Kumulierung: kein Kandidat darf mehr als max_cumulative_votes erhalten
        const hasTooManyForOneCandidate = allVoteCounts.some(
          (v) => v > election.max_cumulative_votes,
        );
        valid = (atLeastOneVote && !hasTooManyForOneCandidate) || invalidHandOver;
      } else {
        // Kein Kumulieren (Checkbox, max 1 pro Person): mindestens 1 Stimme reicht
        valid = atLeastOneVote || invalidHandOver;
      }

      setSaveButtonDisabled(!valid);
    };

    validCheck();
  }, [votes, freeSlots, votesLeft, election, invalidHandOver]);

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
                freeSlots={freeSlotsPreview}
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
              {election?.max_cumulative_votes > 1
                ? `Sie haben ${election?.votes_per_ballot} Stimme/n und können maximal ${election?.max_cumulative_votes} auf eine Person kumulieren.`
                : `Sie können bis zu ${election?.votes_per_ballot} Kandidat/in(en) ankreuzen.`}
            </span>
            <span
              className={`
                text-sm sm:text-md font-bold flex flex-wrap transition-colors
                ${votesLeft > 0 ? 'text-green-400 dark:text-green-500' : 'text-red-400 dark:text-red-500'}
              `}
            >
              {election?.max_cumulative_votes > 1
                ? `Stimmen übrig: ${votesLeft}`
                : `Noch wählbar: ${votesLeft}`}
            </span>
          </div>

          {/* Candidates list */}
          <div className="flex-1 overflow-y-auto px-3 py-3 bg-white dark:bg-gray-800 transition-colors">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden mt-2 mx-2 bg-white dark:bg-gray-800 transition-colors">
              {/* Header - only visible on sm+ */}
              <div
                className="
                  hidden sm:grid sm:grid-cols-[2.5rem_1fr_1fr_5rem]
                  bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold uppercase tracking-wider transition-colors
                "
              >
                <div className="px-3 py-2">Nr.</div>
                {election?.election_type === 'referendum' ? (
                  <>
                    <div className="px-3 py-2 col-span-2">Beschreibung</div>
                  </>
                ) : (
                  <>
                    <div className="px-3 py-2">Kandidat*in</div>
                    <div className="px-3 py-2">Schlagwort</div>
                  </>
                )}
                <div className="px-3 py-2 text-right">Stimmen</div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-gray-200 dark:divide-gray-700 transition-colors">
                {election?.candidates?.length > 0 ? (
                  [...election.candidates].sort((a, b) => a.listnum - b.listnum).map((cand) => (
                    <div
                      key={cand.candidateId}
                      className="
                      flex items-center justify-between sm:grid sm:grid-cols-[2.5rem_1fr_1fr_5rem]
                      gap-3 sm:gap-0 px-4 py-3 sm:py-4
                      hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                    "
                    >
                      {/* Info-Block: Nr, Schlagwort & Name gruppiert auf Mobile */}
                      <div className="flex items-center gap-3 sm:contents">
                        {/* Nr. */}
                        <div className="flex flex-col sm:block">
                          <div className="sm:hidden text-[10px] uppercase text-gray-500 dark:text-gray-400">
                            Nr.
                          </div>
                          <div className="text-gray-900 dark:text-gray-100 text-sm font-medium sm:font-normal">
                            {cand.listnum}
                          </div>
                        </div>

                        {/* Name & Keyword kombiniert für Mobile Platzersparnis */}
                        {election?.election_type === 'referendum' ? (
                          <div className="flex flex-col sm:contents">
                            <div className="sm:hidden text-[10px] uppercase text-gray-500 dark:text-gray-400">
                              Beschreibung
                            </div>
                            <div className="text-gray-900 dark:text-gray-100 text-sm font-semibold sm:font-normal sm:px-3">
                              {/* <li>{cand.firstname}</li>
                              <li>{cand.lastname}</li> */}
                              {cand.keyword}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col sm:contents">
                            <div className="sm:hidden text-[10px] uppercase text-gray-500 dark:text-gray-400">
                              Kandidat*in
                            </div>
                            <div className="text-gray-900 dark:text-gray-100 text-sm font-semibold sm:font-normal sm:px-3">
                              {cand.firstname} {cand.lastname}
                              <span className="block sm:hidden text-[11px] font-normal text-gray-500 dark:text-gray-400 italic">
                                {cand.keyword}
                              </span>
                            </div>
                            {/* Keyword (Nur Desktop Ansicht) */}
                            <div className="hidden sm:block text-gray-900 dark:text-gray-100 text-sm sm:px-1">
                              {cand.keyword}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Stimmen Input - Checkbox wenn kein Kumulieren, sonst Spinner */}
                      <div className="flex flex-col items-end sm:block sm:text-right">
                        {election.max_cumulative_votes > 1 ? (
                          <>
                            <div className="sm:hidden text-[10px] uppercase text-gray-500 dark:text-gray-400 mb-1">
                              Stimmen
                            </div>
                            <input
                              type="number"
                              min={0}
                              max={election.max_cumulative_votes}
                              aria-label={`Stimmen für ${cand.firstname} ${cand.lastname}`}
                              value={votes[cand.listnum] ?? 0}
                              className="
                                w-16 sm:w-20
                                rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600
                                text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm text-center sm:text-left
                                focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 transition-colors
                              "
                              onChange={(e) => {
                                const newValue = Number(e.target.value);
                                const oldValue = Number(votes[cand.listnum] || 0);
                                if (newValue < 0 || newValue > election.max_cumulative_votes) return;
                                if (votesLeft <= 0 && newValue > oldValue) return;
                                setVotes((prev) => ({ ...prev, [cand.listnum]: newValue }));
                                setVotesLeft((prev) => prev - (newValue - oldValue));
                              }}
                            />
                          </>
                        ) : (
                          <input
                            type="checkbox"
                            aria-label={`${cand.firstname} ${cand.lastname} wählen`}
                            checked={(votes[cand.listnum] ?? 0) === 1}
                            disabled={votesLeft <= 0 && (votes[cand.listnum] ?? 0) === 0}
                            className="w-5 h-5 rounded accent-blue-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                            onChange={(e) => {
                              const newValue = e.target.checked ? 1 : 0;
                              const oldValue = votes[cand.listnum] ?? 0;
                              setVotes((prev) => ({ ...prev, [cand.listnum]: newValue }));
                              setVotesLeft((prev) => prev - (newValue - oldValue));
                            }}
                          />
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="mt-4 px-3 py-3 text-gray-900">Keine Kandidaten vorhanden!</div>
                )}
              </div>
            </div>

            {/* Freie Kandidatenauswahl — nur wenn election.free_slots > 0 */}
            {election?.free_slots > 0 && <div className="rounded-xl border border-gray-200 dark:border-gray-700 mt-4 mx-2 bg-white dark:bg-gray-800 transition-colors overflow-hidden">
              <div className="bg-gray-100 dark:bg-gray-700 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-200 flex justify-between">
                <span>Freie Kandidatur (aus Wählerverzeichnis)</span>
                <span className="font-normal normal-case">{freeSlots.length} / {election.free_slots} belegt</span>
              </div>

              {/* Bereits hinzugefügte freie Slots */}
              {freeSlots.length > 0 && (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {freeSlots.map((slot) => (
                    <div
                      key={slot.voterUid}
                      className="flex items-center justify-between sm:grid sm:grid-cols-4 gap-3 sm:gap-0 px-4 py-3"
                    >
                      <div className="flex items-center gap-3 sm:contents">
                        <div className="text-gray-400 dark:text-gray-500 text-sm min-w-[2rem]">–</div>
                        <div className="text-gray-900 dark:text-gray-100 text-sm sm:px-3 sm:col-span-2">
                          {slot.firstname} {slot.lastname}
                          <span className="block text-[11px] text-gray-500 dark:text-gray-400">{slot.voterUid}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        {election.max_cumulative_votes > 1 ? (
                          <input
                            type="number"
                            min={1}
                            max={election.max_cumulative_votes}
                            value={slot.votes}
                            aria-label={`Stimmen für ${slot.firstname} ${slot.lastname}`}
                            className="w-16 sm:w-20 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm text-center focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 transition-colors"
                            onChange={(e) => {
                              const newVal = Number(e.target.value);
                              const oldVal = slot.votes;
                              if (newVal < 1 || newVal > election.max_cumulative_votes) return;
                              if (votesLeft <= 0 && newVal > oldVal) return;
                              setFreeSlots((prev) =>
                                prev.map((s) => s.voterUid === slot.voterUid ? { ...s, votes: newVal } : s)
                              );
                              setVotesLeft((prev) => prev - (newVal - oldVal));
                            }}
                          />
                        ) : (
                          <input
                            type="checkbox"
                            checked={slot.votes === 1}
                            aria-label={`${slot.firstname} ${slot.lastname} wählen`}
                            className="w-5 h-5 rounded accent-blue-600 cursor-pointer"
                            onChange={(e) => {
                              const newVal = e.target.checked ? 1 : 0;
                              const oldVal = slot.votes;
                              setFreeSlots((prev) =>
                                prev.map((s) => s.voterUid === slot.voterUid ? { ...s, votes: newVal } : s)
                              );
                              setVotesLeft((prev) => prev - (newVal - oldVal));
                            }}
                          />
                        )}
                        <button
                          onClick={() => removeFreeSlot(slot.voterUid)}
                          aria-label={`${slot.firstname} ${slot.lastname} entfernen`}
                          className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Eingabe neue freie Stimme */}
              <div className="px-4 py-3 flex flex-col gap-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Name suchen (mind. 2 Zeichen)"
                    value={lookupQuery}
                    onChange={(e) => { setLookupQuery(e.target.value); setLookupResults([]); setLookupResult(null); setLookupError(''); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleLookup(); }}
                    className="flex-1 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 transition-colors"
                  />
                  <button
                    onClick={handleLookup}
                    disabled={lookupLoading || lookupQuery.trim().length < 2}
                    aria-label="Person im Wählerverzeichnis suchen"
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                  >
                    {lookupLoading ? '…' : 'Suchen'}
                  </button>
                </div>

                {/* Suchergebnisse als Auswahlliste */}
                {lookupResults.length > 0 && (
                  <ul className="rounded-lg border border-gray-200 dark:border-gray-600 divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800 shadow text-sm">
                    {lookupResults.map((v) => (
                      <li key={v.uid}>
                        <button
                          onClick={() => handleSelectSearchResult(v)}
                          disabled={v.isFixedCandidate}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-40 disabled:cursor-not-allowed flex justify-between items-center"
                        >
                          <span>
                            <span className="font-medium">{v.lastname}, {v.firstname}</span>
                            <span className="ml-2 text-gray-400 text-xs">{v.faculty}</span>
                          </span>
                          {v.isFixedCandidate && (
                            <span className="text-xs text-gray-400">fester Kandidat</span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {lookupError && (
                  <p className="text-sm text-red-500 dark:text-red-400">{lookupError}</p>
                )}

                {lookupResult && (
                  <div className="flex items-center justify-between rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 px-3 py-2">
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      <span className="font-semibold">{lookupResult.firstname} {lookupResult.lastname}</span>
                      <span className="ml-2 text-gray-500 dark:text-gray-400 text-xs">{lookupResult.faculty}</span>
                    </span>
                    <button
                      onClick={confirmFreeSlot}
                      disabled={votesLeft <= 0}
                      className="ml-3 px-3 py-1 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                    >
                      Hinzufügen
                    </button>
                  </div>
                )}
              </div>
            </div>}
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
              <span>{theme.text.checkBoxConfirm}</span>
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
                  setFreeSlots([]);
                  setLookupUid('');
                  setLookupResult(null);
                  setLookupError('');
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
