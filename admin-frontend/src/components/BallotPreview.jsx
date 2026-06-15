import { useCallback, useEffect, useState } from 'react';
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

const electionTypeLabel = (type) => {
  const map = {
    proportional_representation: 'Verhältniswahl',
    majority_vote: 'Mehrheitswahl',
    referendum: 'Abstimmung',
  };
  return map[type] || type || '—';
};

const BallotPreview = () => {
  const [elections, setElections] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [election, setElection] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    adminService.getElectionsForAdmin().then((data) => setElections(data || []));
  }, []);

  const load = useCallback(async (id) => {
    if (!id) { setElection(null); return; }
    setLoading(true);
    setError('');
    try {
      const data = await adminService.getElectionById(id);
      if (!data) throw new Error('Keine Daten erhalten.');
      setElection(data);
    } catch (err) {
      setError('Fehler beim Laden: ' + err.message);
      setElection(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelect = (e) => {
    const id = e.target.value;
    setSelectedId(id);
    load(id);
  };

  const isReferendum = election?.election_type === 'referendum';
  const candidates = election?.candidates
    ? [...election.candidates].sort((a, b) => a.listnum - b.listnum)
    : [];

  return (
    <div className="p-6 space-y-6">
      {/* Election selector */}
      <div className="max-w-lg">
        <label className="block text-sm font-medium text-gray-700 mb-1">Wahl auswählen</label>
        <select
          value={selectedId}
          onChange={handleSelect}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">— Bitte wählen —</option>
          {elections.map((e) => (
            <option key={e.id} value={e.id}>
              {e.info}{e.description ? ` · ${e.description}` : ''}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Wird geladen…
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {election && !loading && (
        /* Ballot sheet */
        <div className="max-w-2xl border-2 border-gray-800 rounded-lg overflow-hidden shadow-md print:shadow-none">

          {/* Header */}
          <div className="bg-gray-800 text-white px-6 py-4">
            <div className="text-xs uppercase tracking-widest text-gray-400 mb-1">Stimmzettel — Vorschau</div>
            <h2 className="text-lg font-bold leading-tight">{election.info}</h2>
            {election.description && (
              <p className="text-sm text-gray-300 mt-0.5">{election.description}</p>
            )}
          </div>

          {/* Meta info */}
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-gray-600">
            <div>
              <div className="font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Wahltyp</div>
              <div>{electionTypeLabel(election.election_type)}</div>
            </div>
            <div>
              <div className="font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Stimmen</div>
              <div>{election.votes_per_ballot} pro Stimmzettel</div>
            </div>
            {election.max_cumulative_votes > 1 && (
              <div>
                <div className="font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Max. Kumulierung</div>
                <div>{election.max_cumulative_votes} pro Kandidat*in</div>
              </div>
            )}
            <div>
              <div className="font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Zeitraum</div>
              <div>{formatDate(election.start)} – {formatDate(election.end)}</div>
            </div>
          </div>

          {/* Instruction */}
          <div className="px-6 py-3 bg-white border-b border-gray-200 text-sm text-gray-700">
            {isReferendum ? (
              <span>Bitte wählen Sie eine Option.</span>
            ) : election.max_cumulative_votes > 1 ? (
              <span>
                Sie haben <strong>{election.votes_per_ballot}</strong> Stimmen. Sie können
                einer Person bis zu <strong>{election.max_cumulative_votes}</strong> Stimmen geben
                (Kumulieren). Tragen Sie die Stimmanzahl in das Feld ein.
              </span>
            ) : (
              <span>
                Bitte wählen Sie bis zu <strong>{election.votes_per_ballot}</strong>{' '}
                {election.votes_per_ballot === 1 ? 'Person' : 'Personen'} aus.
              </span>
            )}
          </div>

          {/* Candidate table */}
          {candidates.length === 0 ? (
            <div className="px-6 py-6 text-sm text-yellow-700 bg-yellow-50">
              ⚠ Für diese Wahl sind noch keine Kandidaten hinterlegt.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 text-gray-600 text-xs uppercase tracking-wider">
                  <th className="px-3 py-2 text-left w-12">Nr.</th>
                  {isReferendum ? (
                    <th className="px-3 py-2 text-left">Beschreibung</th>
                  ) : (
                    <>
                      <th className="px-3 py-2 text-left">Kandidat*in</th>
                      <th className="px-3 py-2 text-left">Schlagwort</th>
                    </>
                  )}
                  <th className="px-3 py-2 text-center w-24">Stimmen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {candidates.map((cand) => (
                  <tr key={cand.candidateId} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5 text-gray-500 font-mono text-xs">{cand.listnum}</td>
                    {isReferendum ? (
                      <td className="px-3 py-2.5 font-medium text-gray-900">{cand.keyword || '—'}</td>
                    ) : (
                      <>
                        <td className="px-3 py-2.5 text-gray-900">
                          {cand.firstname} {cand.lastname}
                          {cand.faculty && (
                            <span className="block text-xs text-gray-400">{cand.faculty}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-gray-600 italic text-xs">{cand.keyword || ''}</td>
                      </>
                    )}
                    <td className="px-3 py-2.5 text-center">
                      {election.max_cumulative_votes > 1 ? (
                        <span className="inline-block w-12 h-7 border border-gray-400 rounded text-center leading-7 text-gray-400 text-xs">0</span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-5 h-5 border-2 border-gray-400 rounded" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Footer */}
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-2 text-xs text-gray-400 text-right">
            {candidates.length} Kandidat{candidates.length !== 1 ? 'en' : ''} · Schematische Vorschau
          </div>
        </div>
      )}
    </div>
  );
};

export default BallotPreview;
