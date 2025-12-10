import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/Spinner';
import ResponsiveButton from '../components/ResponsiveButton';

const CandidateReview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Schutz
  useEffect(() => {
    if (user?.role !== 'committee' && user?.role !== 'admin') navigate('/home');
  }, [user, navigate]);

  // Daten laden
  const fetchCandidates = async () => {
    try {
      const res = await fetch('/api/committee/candidates');
      if (res.ok) setCandidates(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCandidates(); }, []);

  // Status ändern (API Call)
  const handleStatusChange = async (candidateId, electionId, newStatus) => {
    try {
      const res = await fetch(`/api/committee/candidates/${candidateId}/elections/${electionId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        // Lokales Update für schnelles UI-Feedback
        setCandidates(prev => prev.map(cand => {
          if (cand.id !== candidateId) return cand;
          return {
            ...cand,
            elections: cand.elections.map(el => 
              el.electionId === electionId ? { ...el, status: newStatus } : el
            )
          };
        }));
      }
    } catch (err) {
      alert('Fehler beim Speichern');
    }
  };

  // "Alle Akzeptieren" Funktion für einen Kandidaten
  const handleAcceptAll = (candidate) => {
    if (!window.confirm(`Alle Bewerbungen für ${candidate.lastname} genehmigen?`)) return;
    candidate.elections.forEach(el => {
      if (el.status !== 'ACCEPTED') {
        handleStatusChange(candidate.id, el.electionId, 'ACCEPTED');
      }
    });
  };

  if (loading) return <div className="flex justify-center p-10"><Spinner /></div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Kandidaten-Prüfung</h1>
          <button onClick={() => navigate('/committee')} className="text-blue-600 hover:underline">
            Zurück zur Wahl-Übersicht
          </button>
        </div>

        <div className="grid gap-6">
          {candidates.map(candidate => (
            <div key={candidate.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row gap-6">
              
              {/* 1. Bild & Basis Infos */}
              <div className="w-full md:w-1/4 flex flex-col items-center text-center border-b md:border-b-0 md:border-r border-gray-100 pb-4 md:pb-0 md:pr-4">
                <div className="w-24 h-24 rounded-full bg-gray-200 mb-3 overflow-hidden flex items-center justify-center text-2xl text-gray-400 font-bold">
                  {candidate.image ? <img src={candidate.image} className="w-full h-full object-cover" /> : candidate.lastname[0]}
                </div>
                <h3 className="text-lg font-bold text-gray-800">{candidate.firstname} {candidate.lastname}</h3>
                <p className="text-sm text-gray-500">{candidate.faculty}</p>
                <button 
                  onClick={() => handleAcceptAll(candidate)}
                  className="mt-4 text-xs font-medium text-green-600 border border-green-200 bg-green-50 px-3 py-1 rounded hover:bg-green-100"
                >
                  Alle genehmigen ✅
                </button>
              </div>

              {/* 2. Bewerbungen (Wahlen) */}
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Bewerbungen</h4>
                <div className="space-y-3">
                  {candidate.elections.map(election => (
                    <div key={election.electionId} className="flex flex-col sm:flex-row sm:items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100">
                      
                      {/* Wahl Info */}
                      <div className="mb-2 sm:mb-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-800">{election.electionInfo}</span>
                          {election.isActive && (
                            <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold">AKTIV</span>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          election.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                          election.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          Status: {election.status === 'PENDING' ? 'Ausstehend' : election.status}
                        </span>
                      </div>

                      {/* Aktionen */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStatusChange(candidate.id, election.electionId, 'ACCEPTED')}
                          disabled={election.status === 'ACCEPTED'}
                          className={`p-2 rounded transition-colors ${election.status === 'ACCEPTED' ? 'bg-green-500 text-white cursor-default' : 'bg-white border border-green-300 text-green-600 hover:bg-green-50'}`}
                          title="Akzeptieren"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </button>
                        <button
                          onClick={() => handleStatusChange(candidate.id, election.electionId, 'REJECTED')}
                          disabled={election.status === 'REJECTED'}
                          className={`p-2 rounded transition-colors ${election.status === 'REJECTED' ? 'bg-red-500 text-white cursor-default' : 'bg-white border border-red-300 text-red-600 hover:bg-red-50'}`}
                          title="Ablehnen"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CandidateReview;