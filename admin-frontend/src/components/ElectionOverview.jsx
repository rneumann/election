import { useEffect, useState } from 'react';
import { adminService } from '../services/adminApi.js';

const formatDate = (iso) =>
  iso
    ? new Date(iso).toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

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

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await adminService.getElectionsForAdmin();
        setElections(data || []);
      } catch (err) {
        setError('Fehler beim Laden der Wahlen: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
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
      <div className="p-6 text-red-600 bg-red-50 rounded-lg border border-red-200">{error}</div>
    );
  }

  if (elections.length === 0) {
    return (
      <div className="p-6 text-gray-500 text-sm">Keine Wahlen vorhanden.</div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
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
            const ballots = Number(e.ballots) || 0;
            const participation = voters > 0 ? ((ballots / voters) * 100).toFixed(1) : '—';

            return (
              <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{e.info}</div>
                  <div className="text-xs text-gray-400">{e.description}</div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge election={e} />
                </td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(e.start)}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(e.end)}</td>
                <td className="px-4 py-3 text-right text-gray-700">{e.seats_to_fill}</td>
                <td className="px-4 py-3 text-right text-gray-700">{e.candidates}</td>
                <td className="px-4 py-3 text-right text-gray-700">{voters}</td>
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
  );
};

export default ElectionOverview;
