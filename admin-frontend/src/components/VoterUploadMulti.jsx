/**
 * VoterUploadMulti
 *
 * Zeigt alle Wahlen ohne Wählerverzeichnis in einer zweispaltigen Liste.
 * Links: Wahlinfos. Rechts: Datei-Auswahl + Validierungsstatus.
 * Unten: "Alle hochladen"-Button für en-bloc Upload.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { adminService } from '../services/adminApi.js';
import { validateVoterCSV, transformVoterFile } from '../utils/validators/csvValidator.js';
import { logger } from '../conf/logger/logger.js';
import api from '../services/api.js';
import ResponsiveButton from './ResponsiveButton.jsx';

const fmt = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—';

// Status einer einzelnen Zeile
const STATUS = { IDLE: 'idle', VALIDATING: 'validating', READY: 'ready', ERROR: 'error', DONE: 'done', UPLOADING: 'uploading' };

const StatusIcon = ({ status }) => {
  if (status === STATUS.VALIDATING)
    return <svg className="animate-spin h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>;
  if (status === STATUS.UPLOADING)
    return <svg className="animate-spin h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>;
  if (status === STATUS.READY)
    return <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>;
  if (status === STATUS.DONE)
    return <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>;
  if (status === STATUS.ERROR)
    return <svg className="h-4 w-4 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>;
  return null;
};

// ─── Einzelne Zeile ──────────────────────────────────────────────────────────

const ElectionRow = ({ election, entry, onFileSelect, onRemove }) => {
  const inputRef = useRef(null);

  return (
    <div className={`grid grid-cols-2 gap-4 items-start px-4 py-3 border-b border-gray-100 last:border-0 transition-colors ${entry.status === STATUS.DONE ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
      {/* Links: Wahlinfo */}
      <div>
        <div className="font-medium text-gray-900 text-sm">{election.info}</div>
        <div className="text-xs text-gray-400 mt-0.5">
          {fmt(election.start)} – {fmt(election.end)}
          {election.description && <span className="ml-2 italic">{election.description}</span>}
        </div>
      </div>

      {/* Rechts: Upload */}
      <div className="flex items-center gap-2">
        {entry.status === STATUS.DONE ? (
          <span className="flex items-center gap-1.5 text-sm text-green-700 font-medium">
            <StatusIcon status={STATUS.DONE} /> Hochgeladen
          </span>
        ) : (
          <>
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) onFileSelect(election.id, e.target.files[0]);
              }}
            />

            {entry.file ? (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <StatusIcon status={entry.status} />
                <span className="text-xs text-gray-700 truncate max-w-[140px]" title={entry.file.name}>
                  {entry.file.name}
                </span>
                {entry.status === STATUS.ERROR && (
                  <span className="text-xs text-red-600 truncate max-w-[120px]" title={entry.error}>{entry.error}</span>
                )}
                {entry.status !== STATUS.UPLOADING && (
                  <button
                    onClick={() => { onRemove(election.id); if (inputRef.current) inputRef.current.value = ''; }}
                    className="text-gray-300 hover:text-red-500 transition-colors shrink-0"
                    aria-label="Datei entfernen"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => inputRef.current?.click()}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0l-4 4m4-4v12"/></svg>
                CSV auswählen
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ─── Hauptkomponente ─────────────────────────────────────────────────────────

const VoterUploadMulti = () => {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState('');
  const [globalSuccess, setGlobalSuccess] = useState('');
  const [uploading, setUploading] = useState(false);

  // entries: { [electionId]: { file, status, error, transformedFile } }
  const [entries, setEntries] = useState({});

  const updateEntry = useCallback((id, patch) =>
    setEntries((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } })), []);

  // Wahlen laden — nur solche ohne WVZ (voters = 0)
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const all = await adminService.getElectionsForAdmin();
        const withoutWvz = (all || []).filter((e) => Number(e.voters) === 0);
        setElections(withoutWvz);
        const init = {};
        withoutWvz.forEach((e) => { init[e.id] = { file: null, status: STATUS.IDLE, error: '', transformedFile: null }; });
        setEntries(init);
      } catch (err) {
        setGlobalError('Fehler beim Laden der Wahlen: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Datei auswählen + validieren
  const handleFileSelect = useCallback(async (electionId, file) => {
    updateEntry(electionId, { file, status: STATUS.VALIDATING, error: '', transformedFile: null });

    try {
      const result = await validateVoterCSV(file);
      if (!result.success) {
        const msg = result.errors?.[0]?.message || 'Ungültige CSV-Datei';
        updateEntry(electionId, { status: STATUS.ERROR, error: msg });
        return;
      }
      const transformed = await transformVoterFile(file);
      updateEntry(electionId, { status: STATUS.READY, transformedFile: transformed });
    } catch (err) {
      updateEntry(electionId, { status: STATUS.ERROR, error: err.message });
    }
  }, [updateEntry]);

  const handleRemove = useCallback((electionId) => {
    updateEntry(electionId, { file: null, status: STATUS.IDLE, error: '', transformedFile: null });
  }, [updateEntry]);

  // En-bloc Upload
  const handleUploadAll = async () => {
    setGlobalError('');
    setGlobalSuccess('');

    const toUpload = Object.entries(entries).filter(([, e]) => e.status === STATUS.READY);
    if (toUpload.length === 0) {
      setGlobalError('Bitte zunächst mindestens eine gültige CSV-Datei auswählen.');
      return;
    }

    setUploading(true);
    const csrfToken = localStorage.getItem('csrfToken') || '';
    let successCount = 0;
    let errorCount = 0;

    for (const [electionId, entry] of toUpload) {
      updateEntry(electionId, { status: STATUS.UPLOADING });
      try {
        const formData = new FormData();
        formData.append('file', entry.transformedFile);
        formData.append('electionId', electionId);

        const response = await api.post('/upload/voters', formData, {
          headers: { 'Content-Type': 'multipart/form-data', 'X-CSRF-Token': csrfToken },
        });

        if (response.status === 200) {
          updateEntry(electionId, { status: STATUS.DONE });
          successCount++;
        } else {
          updateEntry(electionId, { status: STATUS.ERROR, error: response.data?.message || 'Upload fehlgeschlagen' });
          errorCount++;
        }
      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'Fehler beim Upload';
        updateEntry(electionId, { status: STATUS.ERROR, error: msg });
        errorCount++;
        logger.error(`Voter upload fehlgeschlagen für ${electionId}:`, err);
      }
    }

    setUploading(false);
    if (successCount > 0 && errorCount === 0) {
      setGlobalSuccess(`${successCount} Wählerverzeichnis${successCount > 1 ? 'se' : ''} erfolgreich hochgeladen.`);
    } else if (errorCount > 0) {
      setGlobalError(`${errorCount} Upload${errorCount > 1 ? 's' : ''} fehlgeschlagen. Bitte prüfen Sie die markierten Zeilen.`);
    }
  };

  const readyCount = Object.values(entries).filter((e) => e.status === STATUS.READY).length;
  const doneCount  = Object.values(entries).filter((e) => e.status === STATUS.DONE).length;

  if (loading) {
    return (
      <div className="flex items-center gap-3 p-6 text-gray-500">
        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
        Wahlen werden geladen…
      </div>
    );
  }

  if (elections.length === 0) {
    return (
      <div className="p-6 text-sm text-gray-500 bg-green-50 rounded-lg border border-green-200">
        ✓ Alle Wahlen haben bereits ein Wählerverzeichnis.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header-Zeile */}
      <div className="grid grid-cols-2 gap-4 px-4 py-2 bg-gray-100 rounded-t-lg text-xs font-semibold text-gray-500 uppercase tracking-wider">
        <div>Wahl</div>
        <div>Wählerverzeichnis (CSV)</div>
      </div>

      {/* Zeilen */}
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        {elections.map((e) => (
          <ElectionRow
            key={e.id}
            election={e}
            entry={entries[e.id] ?? { file: null, status: STATUS.IDLE, error: '' }}
            onFileSelect={handleFileSelect}
            onRemove={handleRemove}
          />
        ))}
      </div>

      {/* Statusmeldungen */}
      {globalSuccess && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">{globalSuccess}</div>
      )}
      {globalError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{globalError}</div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2">
        <span className="text-sm text-gray-500">
          {readyCount > 0 && `${readyCount} bereit`}
          {readyCount > 0 && doneCount > 0 && ' · '}
          {doneCount > 0 && `${doneCount} hochgeladen`}
        </span>
        <ResponsiveButton
          variant="primary"
          size="medium"
          onClick={handleUploadAll}
          disabled={uploading || readyCount === 0}
        >
          {uploading
            ? 'Wird hochgeladen…'
            : `${readyCount > 0 ? readyCount + ' ' : ''}Wählerverzeichnis${readyCount !== 1 ? 'se' : ''} hochladen`}
        </ResponsiveButton>
      </div>
    </div>
  );
};

export default VoterUploadMulti;
