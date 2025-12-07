import { useEffect, useState } from 'react';
import { voterApi } from '../services/voterApi';

export const CandidateInfoModal = ({ open, onClose, electionId }) => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !electionId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const data = await voterApi.getCandidateInfo(electionId);

        console.log(`Geladene Kandidaten:`, data); // Debugging

        // Fallback, falls die API die Daten in einem Unterobjekt zurückgibt (z.B. data.candidates)
        const candidatesArray = Array.isArray(data) ? data : data.candidates || [];

        setCandidates(candidatesArray);
      } catch (err) {
        console.error('Fehler beim Laden der Kandidateninfo', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [open, electionId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Kandidateninformationen</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 font-bold text-xl">
            &times;
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <p className="text-gray-500">Lade Daten...</p>
          </div>
        ) : candidates.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Keine Kandidaten gefunden.</p>
        ) : (
          <ul className="space-y-3">
            {candidates.map((c, index) => (
              /* WICHTIG: Hier wurde c.uid zu c.id geändert.
                 Falls keine ID da ist, nutzen wir den Index als Fallback.
              */
              <li
                key={c.id || index}
                className="border border-gray-200 p-4 rounded-lg shadow-sm bg-gray-50 hover:bg-gray-100 transition"
              >
                <h3 className="font-semibold text-lg text-gray-800">
                  {c.firstname} {c.lastname}
                </h3>
                {/* WICHTIG: c.info existiert meist nicht in der DB, stattdessen c.party */}
                {(c.party || c.info) && (
                  <div className="mt-1 text-sm text-gray-600 flex items-center gap-2">
                    <span className="font-medium">Partei/Info:</span>
                    <span>{c.party || c.info}</span>
                  </div>
                )}
                {/* Falls es eine Beschreibung gibt */}
                {c.description && (
                  <p className="text-xs text-gray-500 mt-2 italic">{c.description}</p>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
