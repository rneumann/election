import { useCallback, useEffect, useRef, useState } from 'react';
import { adminService } from '../services/adminApi.js';

const REFRESH_INTERVAL_MS = 5000;

const formatDate = (iso) => {
  if (!iso) return { date: '—', time: '' };
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    time: d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
  };
};

const StatusBadge = ({ election }) => {
  const now = new Date();
  const start = new Date(election.start);
  const end = new Date(election.end);

  if (election.test_election_active) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
        Testwahl aktiv
      </span>
    );
  }
  if (now < start) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
        Geplant
      </span>
    );
  }
  if (now >= start && now <= end) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
        Aktiv
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
      Beendet
    </span>
  );
};

const ElectionOverview = () => {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await adminService.getElectionsForAdmin();
      setElections(data || []);
      setLastUpdated(new Date());
      setError('');
    } catch (err) {
      setError('Fehler beim Laden der Wahlen: ' + err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Initialer Load
  useEffect(() => { load(); }, [load]);

  // Auto-Refresh
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => load(true), REFRESH_INTERVAL_MS);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [autoRefresh, load]);

  const Toolbar = () => (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
      <button
        onClick={() => load(false)}
        disabled={loading}
        className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors disabled:opacity-50"
        aria-label="Aktualisieren"
      >
        <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Aktualisieren
      </button>

      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
        <div
          onClick={() => setAutoRefresh((v) => !v)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${autoRefresh ? 'bg-blue-600' : 'bg-gray-300'}`}
        >
          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${autoRefresh ? 'translate-x-4' : 'translate-x-1'}`} />
        </div>
        Auto-Refresh (5 s)
      </label>

      {lastUpdated && (
        <span className="ml-auto text-xs text-gray-400">
          Zuletzt: {lastUpdated.toLocaleTimeString('de-DE')}
        </span>
      )}
    </div>
  );

  if (loading && elections.length === 0) {
    return (
      <div className="flex items-center gap-3 p-6 text-gray-500">
        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Wahlen werden geladen…
      </div>
    );
  }

  if (error) {
    return (
      <>
        <Toolbar />
        <div className="p-6 text-red-600 bg-red-50 rounded-lg border border-red-200">{error}</div>
      </>
    );
  }

  if (elections.length === 0) {
    return (
      <>
        <Toolbar />
        <div className="p-6 text-gray-500 text-sm">Keine Wahlen vorhanden.</div>
      </>
    );
  }

  return (
    <div>
      <Toolbar />
      <div className="overflow-x-auto">
      <table className="w-full min-w-max divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider text-xs">Bezeichnung</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider text-xs">Status</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider text-xs">Start</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider text-xs">Ende</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-600 uppercase tracking-wider text-xs">Plätze</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-600 uppercase tracking-wider text-xs">Kandidaten</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-600 uppercase tracking-wider text-xs">Wähler</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-600 uppercase tracking-wider text-xs">Stimmzettel</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-600 uppercase tracking-wider text-xs">Beteiligung</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider text-xs">Ergebnis</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {elections.map((e) => {
            const voters = Number(e.voters) || 0;
            const candidates = Number(e.candidates) || 0;
            const ballots = Number(e.ballots) || 0;
            const participation = voters > 0 ? ((ballots / voters) * 100).toFixed(1) : '—';
            const missingData = voters === 0 || candidates === 0;

            return (
              <tr key={e.id} className={`transition-colors ${missingData ? 'bg-yellow-50 hover:bg-yellow-100' : 'hover:bg-gray-50'}`}>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{e.info}</div>
                  <div className="text-xs text-gray-400">{e.description}</div>
                  {missingData && (
                    <div className="text-xs text-yellow-700 font-medium mt-0.5">
                      ⚠ {voters === 0 && candidates === 0 ? 'Keine Wähler und keine Kandidaten' : voters === 0 ? 'Keine Wähler eingetragen' : 'Keine Kandidaten eingetragen'}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge election={e} />
                </td>
                <td className="px-4 py-3 text-gray-600">
                  <div>{formatDate(e.start).date}</div>
                  <div className="text-xs text-gray-400">{formatDate(e.start).time}</div>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  <div>{formatDate(e.end).date}</div>
                  <div className="text-xs text-gray-400">{formatDate(e.end).time}</div>
                </td>
                <td className="px-4 py-3 text-right text-gray-700">{e.seats_to_fill}</td>
                <td className={`px-4 py-3 text-right font-medium ${candidates === 0 ? 'text-yellow-700' : 'text-gray-700'}`}>{candidates}</td>
                <td className={`px-4 py-3 text-right font-medium ${voters === 0 ? 'text-yellow-700' : 'text-gray-700'}`}>{voters}</td>
                <td className="px-4 py-3 text-right text-gray-700">{ballots}</td>
                <td className="px-4 py-3 text-right">
                  {voters > 0 ? (
                    <span
                      className={`font-medium ${
                        Number(participation) >= 50
                          ? 'text-green-600'
                          : Number(participation) >= 25
                            ? 'text-yellow-600'
                            : 'text-red-500'
                      }`}
                    >
                      {participation} %
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {e.is_final ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      Finalisiert
                    </span>
                  ) : e.result_id ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                      Vorläufig
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    </div>
  );
};

export default ElectionOverview;
