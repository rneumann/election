import { useState } from 'react';
import ResponsiveButton from './ResponsiveButton.jsx';
import api from '../services/api.js';
import { logger } from '../conf/logger/logger.js';

// ─── Konsistente Wahltyp/Zählverfahren-Kombinationen ─────────────────────────

const WAHLTYPEN = ['Verhältniswahl', 'Mehrheitswahl', 'Urabstimmung'];

const ZAEHLVERFAHREN_BY_WAHLTYP = {
  Verhältniswahl: ['Sainte-Laguë', 'Hare-Niemeyer'],
  Mehrheitswahl: ['Einfache Mehrheit', 'Absolute Mehrheit'],
  Urabstimmung: ['Ja/Nein/Enthaltung'],
};

const today = () => new Date().toISOString().slice(0, 10);
const inTwoWeeks = () => {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
};

const emptyElection = () => ({
  id: crypto.randomUUID(),
  kennung: '',
  info: '',
  listen: 0,
  plaetze: '',
  stimmen: '',
  kum: 0,
  wahltyp: 'Mehrheitswahl',
  zaehlverfahren: 'Einfache Mehrheit',
  freieplaetze: 0,
});

// ─── Komponente ───────────────────────────────────────────────────────────────

const ElectionTemplateBuilder = () => {
  const [startDate, setStartDate] = useState(today());
  const [startTime, setStartTime] = useState('08:00');
  const [endDate, setEndDate] = useState(inTwoWeeks());
  const [endTime, setEndTime] = useState('18:00');
  const [elections, setElections] = useState([emptyElection()]);
  const [format, setFormat] = useState('ods');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Zeilen-Operationen ──────────────────────────────────────────────────────

  const addRow = () => setElections((prev) => [...prev, emptyElection()]);

  const removeRow = (id) =>
    setElections((prev) => (prev.length > 1 ? prev.filter((e) => e.id !== id) : prev));

  const updateRow = (id, field, value) => {
    setElections((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const updated = { ...e, [field]: value };
        // Zählverfahren zurücksetzen wenn Wahltyp wechselt
        if (field === 'wahltyp') {
          updated.zaehlverfahren = ZAEHLVERFAHREN_BY_WAHLTYP[value][0];
          // Listen auf 0 setzen für Mehrheit/Urabstimmung
          if (value !== 'Verhältniswahl') updated.listen = 0;
        }
        return updated;
      }),
    );
  };

  // ── Validierung ─────────────────────────────────────────────────────────────

  const validate = () => {
    if (!startDate || !endDate) return 'Bitte Start- und Enddatum angeben.';
    if (startDate >= endDate) return 'Das Enddatum muss nach dem Startdatum liegen.';
    for (const e of elections) {
      if (!e.kennung.trim()) return 'Jede Wahl benötigt eine Kennung.';
      if (!e.info.trim()) return 'Jede Wahl benötigt eine Bezeichnung.';
      if (!e.plaetze || Number(e.plaetze) < 1) return `Wahl "${e.kennung}": Plätze muss ≥ 1 sein.`;
      if (!e.stimmen || Number(e.stimmen) < 1) return `Wahl "${e.kennung}": Stimmen muss ≥ 1 sein.`;
    }
    const kennungen = elections.map((e) => e.kennung.trim());
    if (new Set(kennungen).size !== kennungen.length) return 'Kennungen müssen eindeutig sein.';
    return null;
  };

  // ── Download ────────────────────────────────────────────────────────────────

  const handleDownload = async () => {
    setError('');
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    try {
      const payload = {
        startDate: startDate.split('-').reverse().join('.'), // ISO → DD.MM.YYYY
        startTime,
        endDate: endDate.split('-').reverse().join('.'),
        endTime,
        elections: elections.map((e) => ({ ...e, plaetze: Number(e.plaetze), stimmen: Number(e.stimmen), kum: Number(e.kum) || 0 })),
        format,
      };

      const ext = format === 'xlsx' ? 'xlsx' : 'ods';
      const response = await api.post('/templates-download/template/elections/custom', payload, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `HKA_Wahlkonfiguration.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      logger.error('Fehler beim Erstellen der Vorlage:', err);
      setError('Fehler beim Erstellen der Vorlage. Bitte prüfen Sie die Eingaben.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Wahlzeitraum */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Wahlzeitraum</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Start-Datum</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Start-Uhrzeit</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">End-Datum</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">End-Uhrzeit</label>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-400" />
          </div>
        </div>
      </div>

      {/* Wahltabelle */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Wahlen</h3>
          <button onClick={addRow}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Wahl hinzufügen
          </button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Kennung *', 'Bezeichnung *', 'Wahltyp *', 'Zählverfahren *', 'Plätze *', 'Stimmen *', 'max. Kum.', 'Listen', 'Freie Pl.', ''].map((h) => (
                  <th key={h} className="px-2 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {elections.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-2 py-1.5">
                    <input value={e.kennung} onChange={(ev) => updateRow(e.id, 'kennung', ev.target.value)}
                      placeholder="z.B. stupa_2026"
                      className="w-28 border border-gray-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-400" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={e.info} onChange={(ev) => updateRow(e.id, 'info', ev.target.value)}
                      placeholder="Bezeichnung"
                      className="w-40 border border-gray-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-400" />
                  </td>
                  <td className="px-2 py-1.5">
                    <select value={e.wahltyp} onChange={(ev) => updateRow(e.id, 'wahltyp', ev.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-400 bg-white">
                      {WAHLTYPEN.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <select value={e.zaehlverfahren} onChange={(ev) => updateRow(e.id, 'zaehlverfahren', ev.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-400 bg-white">
                      {(ZAEHLVERFAHREN_BY_WAHLTYP[e.wahltyp] || []).map((z) => <option key={z}>{z}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" min={1} value={e.plaetze} onChange={(ev) => updateRow(e.id, 'plaetze', ev.target.value)}
                      className="w-16 border border-gray-300 rounded px-2 py-1 text-xs text-center focus:ring-1 focus:ring-blue-400" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" min={1} value={e.stimmen} onChange={(ev) => updateRow(e.id, 'stimmen', ev.target.value)}
                      className="w-16 border border-gray-300 rounded px-2 py-1 text-xs text-center focus:ring-1 focus:ring-blue-400" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" min={0} value={e.kum} onChange={(ev) => updateRow(e.id, 'kum', ev.target.value)}
                      className="w-16 border border-gray-300 rounded px-2 py-1 text-xs text-center focus:ring-1 focus:ring-blue-400" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" min={0} max={1} value={e.listen}
                      disabled={e.wahltyp !== 'Verhältniswahl'}
                      onChange={(ev) => updateRow(e.id, 'listen', Number(ev.target.value))}
                      className="w-14 border border-gray-300 rounded px-2 py-1 text-xs text-center focus:ring-1 focus:ring-blue-400 disabled:bg-gray-100 disabled:text-gray-400" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" min={0} value={e.freieplaetze} onChange={(ev) => updateRow(e.id, 'freieplaetze', Number(ev.target.value))}
                      className="w-14 border border-gray-300 rounded px-2 py-1 text-xs text-center focus:ring-1 focus:ring-blue-400" />
                  </td>
                  <td className="px-2 py-1.5">
                    <button onClick={() => removeRow(e.id)} disabled={elections.length === 1}
                      className="text-gray-300 hover:text-red-500 disabled:opacity-30 transition-colors"
                      aria-label="Zeile entfernen">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-1">* Pflichtfelder. Zählverfahren wird automatisch auf gültige Optionen beschränkt.</p>
      </div>

      {/* Format + Fehler + Download */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Format:</span>
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input type="radio" name="builderFormat" value="ods" checked={format === 'ods'} onChange={() => setFormat('ods')} />
            ODS (LibreOffice)
          </label>
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input type="radio" name="builderFormat" value="xlsx" checked={format === 'xlsx'} onChange={() => setFormat('xlsx')} />
            XLSX (Excel)
          </label>
        </div>

        <ResponsiveButton variant="primary" size="medium" onClick={handleDownload} disabled={loading}>
          {loading ? 'Wird erstellt…' : `Vorlage erstellen & herunterladen (.${format})`}
        </ResponsiveButton>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
};

export default ElectionTemplateBuilder;
