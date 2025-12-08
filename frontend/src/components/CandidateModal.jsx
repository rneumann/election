import { useEffect, useState } from 'react';
import { candidateApi } from '../services/candidateApi';
import { logger } from '../conf/logger/logger';

/**
 * Modal component that displays a list of candidates for a specific election.
 * It allows viewing detailed information for a single candidate.
 *
 * @param {Object} props - The component props
 * @param {boolean} props.open - Controls the visibility of the modal
 * @param {Function} props.onClose - Callback function to close the modal
 * @param {string|number} props.electionId - The ID of the election to fetch candidates for
 * @returns {JSX.Element|null} The rendered modal component or null if closed
 */
export const CandidateInfoModal = ({ open, onClose, electionId }) => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  /**
   * Effect hook to fetch candidate data when the modal opens or electionId changes.
   * Resets the selected candidate and handles the loading state.
   */
  useEffect(() => {
    if (!open || !electionId) {
      return;
    }

    // Reset selection to ensure list view is shown first
    setSelectedCandidate(null);

    const loadCandidates = async () => {
      setLoading(true);
      try {
        const data = await candidateApi.getCandidateInfo(electionId);
        logger.log('API Response Candidates:', data);

        // Ensure we strictly work with an array
        const candidatesArray = Array.isArray(data) ? data : data.candidates || [];
        setCandidates(candidatesArray);
      } catch (err) {
        logger.error('Error loading candidate info:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCandidates();
  }, [open, electionId]);

  /**
   * Handles the click event on a candidate item.
   * Sets the specific candidate to display their details.
   * @param {Object} candidate - The selected candidate object
   */
  const handleCandidateClick = (candidate) => {
    logger.log('Candidate clicked:', candidate);
    setSelectedCandidate(candidate);
  };

  /**
   * Resets the view from details back to the candidate list.
   */
  const handleBack = () => {
    setSelectedCandidate(null);
  };

  if (!open) {
    return null;
  }

  return (
    // Overlay container with backdrop blur
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4 backdrop-blur-sm">
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col animate-fadeIn"
        // Prevent click propagation to avoid closing modal when clicking inside content
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Section */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">
            {selectedCandidate ? 'Kandidatendetails' : 'Kandidatenliste'}
          </h2>

          <button
            onClick={() => {
              setSelectedCandidate(null);
              onClose();
            }}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1 transition-colors"
            aria-label="Close modal"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-10 space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-500 text-sm">Lade Kandidaten...</p>
            </div>
          )}

          {/* Detailed View for a Single Candidate */}
          {!loading && selectedCandidate && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex flex-col items-center text-center">
                <img
                  src={
                    selectedCandidate.image
                      ? selectedCandidate.image
                      : `https://ui-avatars.com/api/?name=${selectedCandidate.firstname || '?'}+${selectedCandidate.lastname || '?'}&background=random&color=fff&size=256`
                  }
                  alt="Avatar"
                  // 3:4 aspect ratio (h-32 w-24) with rounded corners
                  className="w-24 h-32 rounded-lg shadow-md mb-3 object-cover bg-gray-200"
                />
                <h3 className="text-xl font-bold text-gray-800">
                  {selectedCandidate.firstname} {selectedCandidate.lastname}
                </h3>
                <p className="text-sm text-blue-600 font-medium mt-1">{selectedCandidate.party}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-700 mb-2">Beschreibung</h4>
                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                  {selectedCandidate.description || 'Keine Beschreibung verfügbar.'}
                </p>
              </div>

              <button
                onClick={handleBack}
                className="w-full mt-4 bg-gray-100 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-200 transition flex items-center justify-center gap-2"
              >
                <span>←</span> Zurück zur Liste
              </button>
            </div>
          )}

          {/* List View of All Candidates */}
          {!loading && !selectedCandidate && (
            <>
              {candidates.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-gray-500">Keine Kandidaten gefunden.</p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {candidates.map((c, index) => (
                    <li
                      // Fallback to index if ID is missing to prevent React key warnings
                      key={c.id || index}
                      onClick={() => handleCandidateClick(c)}
                      className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:shadow-md hover:border-blue-200 transition-all duration-200 bg-white cursor-pointer group"
                    >
                      {/* Left: Avatar Image */}
                      <img
                        src={`https://ui-avatars.com/api/?name=${c.firstname}+${c.lastname}&background=random&color=fff&size=128`}
                        className="w-12 h-12 rounded-full shadow-sm group-hover:scale-105 transition-transform shrink-0"
                        alt={`${c.firstname} ${c.lastname}`}
                      />

                      {/* Center: Name and Party info (Centered text) */}
                      <div className="flex-grow text-center px-2">
                        <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-700 transition-colors">
                          {c.firstname} {c.lastname}
                        </h3>
                        <p className="text-sm text-blue-600 font-medium">
                          {c.party || 'Parteilos'}
                        </p>
                      </div>

                      {/* Right: Interaction Indicator */}
                      <div className="text-gray-300 group-hover:text-blue-500 shrink-0">→</div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        {/* Footer Section */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="bg-white border border-gray-300 text-gray-700 px-5 py-2 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
