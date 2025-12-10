import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
// NEU: Wir nutzen unser eigenes Modal, nicht das Wahl-Modal!
import { CommitteeCandidateModal } from '../components/CommitteeCandidateModal';
import { Spinner } from '../components/Spinner';

// --- SUB-COMPONENT ---
// Außerhalb definiert, um Re-Renders zu vermeiden
const ElectionCard = ({ election, statusColor, onClick }) => {
  return (
    <div
      onClick={() => onClick(election)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick(election);
        }
      }}
      role="button"
      tabIndex={0}
      className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-brand-primary cursor-pointer transition-all group outline-none focus:ring-2 focus:ring-brand-primary"
    >
      <div className="flex justify-between items-start mb-2">
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusColor}`}>
          ID: {election.id}
        </span>
        <svg
          className="w-5 h-5 text-gray-400 group-hover:text-brand-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-gray-800 mb-1">{election.info}</h3>
      <p className="text-sm text-gray-500 line-clamp-2">{election.description}</p>
      <div className="mt-4 text-xs text-gray-400">
        Start: {new Date(election.start).toLocaleDateString()}
      </div>
    </div>
  );
};

ElectionCard.propTypes = {
  election: PropTypes.shape({
    id: PropTypes.number.isRequired,
    info: PropTypes.string.isRequired,
    description: PropTypes.string,
    start: PropTypes.string.isRequired,
  }).isRequired,
  statusColor: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
};

// --- MAIN COMPONENT ---

const CommitteeDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State
  const [elections, setElections] = useState({ current: [], future: [] });
  const [loading, setLoading] = useState(true);

  const [selectedElection, setSelectedElection] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Schutz: Nur Committee/Admin
  useEffect(() => {
    if (user && user.role !== 'committee' && user.role !== 'admin') {
      navigate('/home');
    }
  }, [user, navigate]);

  // Wahlen laden
  useEffect(() => {
    const fetchElections = async () => {
      try {
        const res = await fetch('/api/committee/elections');
        if (!res.ok) {
          throw new Error('Fehler beim Laden');
        }
        const data = await res.json();

        const now = new Date();
        const current = [];
        const future = [];

        data.forEach((election) => {
          const startDate = new Date(election.start);
          const endDate = new Date(election.end);
          if (now >= startDate && now <= endDate) {
            current.push(election);
          } else if (now < startDate) {
            future.push(election);
          }
        });
        setElections({ current, future });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchElections();
  }, []);

  // Klick auf Wahl -> Modal öffnen & Kandidaten laden
  const handleElectionClick = async (election) => {
    setSelectedElection(election);
    setIsModalOpen(true);
    setLoadingCandidates(true);
    setCandidates([]); // Reset

    try {
      const res = await fetch(`/api/committee/elections/${election.id}/candidates`);
      if (res.ok) {
        const data = await res.json();
        setCandidates(data);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    } finally {
      setLoadingCandidates(false);
    }
  };

  // Status ändern (Kopie aus CandidateReview)
  const handleStatusChange = async (candidateId, newStatus) => {
    if (!selectedElection) {
      return;
    }
    const csrfToken = localStorage.getItem('csrfToken');

    try {
      const res = await fetch(
        `/api/committee/candidates/${candidateId}/elections/${selectedElection.id}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          body: JSON.stringify({ status: newStatus }),
        },
      );

      if (res.ok) {
        // Lokales Update, damit sich die Farbe sofort ändert
        setCandidates((prev) =>
          prev.map((cand) => (cand.id === candidateId ? { ...cand, status: newStatus } : cand)),
        );
      } else {
        const errData = await res.json();
        alert(`Fehler: ${errData.message}`);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-10">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section (zusammengefasst) */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Wahlausschuss Übersicht</h1>
          <button
            onClick={() => navigate('/committee/candidates')}
            className="bg-brand-primary text-white px-4 py-2 rounded hover:bg-opacity-90 transition-colors"
            type="button"
          >
            Kandidaten verwalten
          </button>
        </div>

        {/* LAUFENDE WAHLEN */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
            Aktuell laufende Wahlen
          </h2>
          {elections.current.length === 0 ? (
            <p className="text-gray-500 italic">Keine aktiven Wahlen.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {elections.current.map((election) => (
                <ElectionCard
                  key={election.id}
                  election={election}
                  statusColor="bg-green-100 text-green-800"
                  onClick={handleElectionClick}
                />
              ))}
            </div>
          )}
        </section>

        {/* ZUKÜNFTIGE WAHLEN */}
        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            Geplante Wahlen
          </h2>
          {elections.future.length === 0 ? (
            <p className="text-gray-500 italic">Keine geplanten Wahlen.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {elections.future.map((election) => (
                <ElectionCard
                  key={election.id}
                  election={election}
                  statusColor="bg-blue-100 text-blue-800"
                  onClick={handleElectionClick}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* UNSER NEUES READ-ONLY MODAL */}
      <CommitteeCandidateModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        election={selectedElection}
        candidates={candidates}
        loading={loadingCandidates}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
};

export default CommitteeDashboard;
