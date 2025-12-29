/* eslint-disable */
import { useEffect } from 'react';
import api, { exportElectionResultExcel } from '../../services/api.js';
import { adminService } from '../../services/adminApi.js';
import { logger } from '../../conf/logger/logger.js';

/**
 * CountingSection Component - Handles election vote counting
 *
 * Features:
 * - Lists all elections that can be counted
 * - Triggers counting process via API
 * - Displays counting results with majority information
 * - Shows tie detection warnings
 * - Export results as Excel
 *
 * @param {Object} props - Component props
 * @param {Object} props.theme - Theme configuration
 * @param {Array} props.elections - List of elections
 * @param {Function} props.setElections - Set elections state
 * @param {boolean} props.loadingElections - Loading state
 * @param {Function} props.setLoadingElections - Set loading state
 * @param {string|null} props.countingElectionId - ID of election being counted
 * @param {Function} props.setCountingElectionId - Set counting election ID
 * @param {string} props.countingError - Error message
 * @param {Function} props.setCountingError - Set error message
 * @returns {JSX.Element} Counting interface
 */
const CountingSection = ({
  theme,
  elections,
  setElections,
  loadingElections,
  setLoadingElections,
  countingElectionId,
  setCountingElectionId,
  countingError,
  setCountingError,
}) => {
  /**
   * Load all elections from API
   */
  const loadElections = async () => {
    setLoadingElections(true);
    setCountingError('');

    try {
      const finishedElections = await adminService.getElectionsForAdmin('finished');

      setElections(finishedElections || []);
      logger.debug('Updated elections:', elections);
    } catch (error) {
      setCountingError(`Fehler beim Laden der Wahlen: ${error.message}`);
    } finally {
      setLoadingElections(false);
    }
  };

  // Load elections on mount
  useEffect(() => {
    loadElections();
  }, []);

  /**
   * Perform counting for an election
   *
   * @param {string} electionId - UUID of election to count
   */
  const handleCount = async (electionId) => {
    setCountingElectionId(electionId);
    setCountingError('');

    // Clear previous result/error for this election
    setElections((prev) =>
      prev.map((e) =>
        e.id === electionId ? { ...e, countingResult: null, countingError: null } : e,
      ),
    );

    try {
      const response = await api.post(`/counting/${electionId}/count`);

      if (response.data.success) {
        const countResult = response.data.data;

        // Load full results
        const resultsResponse = await api.get(`/counting/${electionId}/results`);
        if (resultsResponse.data.success) {
          const fullResult = {
            ...countResult,
            fullResults: resultsResponse.data.data,
          };

          // Update election with result
          setElections((prev) =>
            prev.map((e) =>
              e.id === electionId ? { ...e, countingResult: fullResult, countingError: null } : e,
            ),
          );
        }
      } else {
        // Store error in election object
        setElections((prev) =>
          prev.map((e) =>
            e.id === electionId
              ? {
                  ...e,
                  countingError: response.data.message || 'Auszählung fehlgeschlagen',
                }
              : e,
          ),
        );
      }
    } catch (error) {
      // Store error in election object
      const errorMessage = error.response?.data?.message || error.message || 'Unbekannter Fehler';
      setElections((prev) =>
        prev.map((e) => (e.id === electionId ? { ...e, countingError: errorMessage } : e)),
      );
    } finally {
      setCountingElectionId(null);
    }
  };

  /**
   * Export election result as Excel file
   *
   * @param {string} resultId - UUID of the election result
   */
  const handleExportResult = async (resultId) => {
    try {
      const blob = await exportElectionResultExcel(resultId);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      link.download = `Wahlergebnis_${resultId.substring(0, 8)}_${timestamp}.xlsx`;

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setCountingError(`Failed to export election result: ${error.message}`);
    }
  };

  /**
   * Format date to German locale
   *
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date
   */
  const formatDate = (dateString) => {
    if (!dateString) {
      return '';
    }
    return new Date(dateString).toLocaleString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-xl font-bold text-gray-900">Wahlergebnisse auszählen</h2>
        <p className="text-sm text-gray-600 mt-1">
          Wählen Sie eine Wahl aus, um die Stimmen automatisch auszuzählen. Das System verwendet den
          für die Wahl konfigurierten Algorithmus (Sainte-Laguë, Hare-Niemeyer, Höchststimmen, oder
          Referendum).
        </p>
      </div>

      <div className="p-6">
        {/* Loading State */}
        {loadingElections && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="text-gray-700 font-medium">Lade Wahlen...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {countingError && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex gap-3">
            <svg
              className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="text-sm">
              <p className="font-semibold">Fehler</p>
              <p className="mt-1">{countingError}</p>
            </div>
          </div>
        )}

        {/* Elections List */}
        {!loadingElections && elections.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <p className="text-gray-600">Keine Wahlen gefunden</p>
          </div>
        )}

        {!loadingElections && elections.length > 0 && (
          <div className="space-y-4">
            {elections.map((election) => (
              <div
                key={election.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-lg mb-1">{election.info}</h3>
                    <p className="text-sm text-gray-600 mb-2">{election.description}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <span>
                          {formatDate(election.start)} - {formatDate(election.end)}
                        </span>
                      </div>
                      {election.candidates !== undefined && (
                        <div>Kandidaten: {election.candidates}</div>
                      )}
                      {election.ballots !== undefined && <div>Stimmzettel: {election.ballots}</div>}
                    </div>
                  </div>
                  <div className="ml-4">
                    <button
                      onClick={() => handleCount(election.id)}
                      disabled={countingElectionId === election.id}
                      style={{
                        backgroundColor:
                          countingElectionId === election.id ? '#9CA3AF' : theme.colors.primary,
                      }}
                      className="px-4 py-2 text-white font-medium rounded hover:opacity-90 transition-opacity disabled:cursor-not-allowed"
                    >
                      {countingElectionId === election.id ? (
                        <div className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          <span>Zählt...</span>
                        </div>
                      ) : (
                        'Auszählen'
                      )}
                    </button>
                  </div>
                </div>

                {/* Results Display directly under election */}
                {election.countingResult && (
                  <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <svg
                        className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div className="flex-1">
                        <p className="font-bold text-green-900 mb-1">✓ Auszählung erfolgreich</p>
                        <p className="text-xs text-green-800 mb-3">
                          Algorithmus:{' '}
                          <span className="font-semibold">{election.countingResult.algorithm}</span>{' '}
                          · Version:{' '}
                          <span className="font-semibold">{election.countingResult.version}</span> ·
                          Gezählt am:{' '}
                          <span className="font-semibold">
                            {formatDate(election.countingResult.counted_at)}
                          </span>
                        </p>

                        {/* Tie Detection Warning */}
                        {election.countingResult.ties_detected && (
                          <div className="bg-yellow-50 border border-yellow-300 rounded p-3 mb-3">
                            <div className="flex items-start gap-2">
                              <svg
                                className="w-4 h-4 text-yellow-600 flex-shrink-0"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              <div className="text-xs text-yellow-900">
                                <p className="font-semibold">Stimmengleichheit erkannt</p>
                                <p className="mt-1">
                                  {election.countingResult.fullResults?.result_data?.tie_info ||
                                    'Losentscheid erforderlich.'}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Full Results Display */}
                        {election.countingResult.fullResults &&
                          election.countingResult.fullResults.result_data && (
                            <div className="bg-white border border-green-300 rounded-lg p-3">
                              {/* Majority Info (for majority_vote algorithm) */}
                              {election.countingResult.fullResults.result_data.majority_info && (
                                <div
                                  className={`p-2 rounded mb-3 text-xs ${election.countingResult.fullResults.result_data.absolute_majority_achieved ? 'bg-green-100 text-green-900' : 'bg-yellow-100 text-yellow-900'}`}
                                >
                                  <p className="font-medium">
                                    {election.countingResult.fullResults.result_data.majority_info}
                                  </p>
                                  {election.countingResult.fullResults.result_data
                                    .absolute_majority_required &&
                                    election.countingResult.fullResults.result_data
                                      .absolute_majority_achieved === false && (
                                      <p className="mt-1">
                                        💡 Stichwahl zwischen Top-2-Kandidaten erforderlich.
                                      </p>
                                    )}
                                </div>
                              )}

                              {/* Elected Candidates (for vote-based algorithms) */}
                              {election.countingResult.fullResults.result_data.all_candidates ? (
                                <div>
                                  <p className="text-xs font-semibold text-gray-700 mb-2">
                                    Kandidaten (alle):
                                  </p>
                                  <div className="space-y-1">
                                    {election.countingResult.fullResults.result_data.all_candidates.map(
                                      (candidate, idx) => {
                                        const elected = candidate.is_elected;
                                        const tie = candidate.is_tie;
                                        return (
                                          <div
                                            key={idx}
                                            className={`flex justify-between items-center p-2 rounded text-xs ${elected ? 'bg-green-50 border border-green-200' : 'bg-gray-50'} ${tie && !elected ? 'outline outline-yellow-300' : ''}`}
                                          >
                                            <span className="font-medium text-gray-900">
                                              {candidate.candidate ||
                                                `${candidate.firstname} ${candidate.lastname}`}
                                            </span>
                                            <div className="text-right flex flex-col items-end">
                                              <span className="font-bold text-gray-900">
                                                {candidate.votes}{' '}
                                                {candidate.votes === 1 ? 'Stimme' : 'Stimmen'}
                                              </span>
                                              <div className="flex gap-2 mt-1">
                                                {candidate.percentage && (
                                                  <span className="text-gray-600">
                                                    {candidate.percentage}%
                                                  </span>
                                                )}
                                                {elected && (
                                                  <span className="px-1.5 py-0.5 bg-green-600 text-white rounded-sm text-[10px] font-semibold">
                                                    Gewählt
                                                  </span>
                                                )}
                                                {tie && (
                                                  <span className="px-1.5 py-0.5 bg-yellow-500 text-white rounded-sm text-[10px] font-semibold">
                                                    Gleichstand
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      },
                                    )}
                                  </div>
                                </div>
                              ) : (
                                election.countingResult.fullResults.result_data.elected && (
                                  <div>
                                    <p className="text-xs font-semibold text-gray-700 mb-2">
                                      Gewählte Kandidaten:
                                    </p>
                                    <div className="space-y-1">
                                      {election.countingResult.fullResults.result_data.elected.map(
                                        (candidate, idx) => (
                                          <div
                                            key={idx}
                                            className="flex justify-between items-center p-2 bg-gray-50 rounded text-xs"
                                          >
                                            <span className="font-medium text-gray-900">
                                              {candidate.candidate ||
                                                candidate.name ||
                                                `${candidate.firstname || ''} ${candidate.lastname || ''}`.trim() ||
                                                `Option ${candidate.listnum}`}
                                            </span>
                                            <div className="text-right">
                                              <span className="font-bold text-gray-900">
                                                {candidate.votes}{' '}
                                                {candidate.votes === 1 ? 'Stimme' : 'Stimmen'}
                                              </span>
                                              {candidate.percentage && (
                                                <span className="ml-2 text-gray-600">
                                                  ({candidate.percentage}%)
                                                </span>
                                              )}
                                              {candidate.seats && (
                                                <span className="ml-2 text-gray-600">
                                                  · {candidate.seats}{' '}
                                                  {candidate.seats === 1 ? 'Sitz' : 'Sitze'}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                )
                              )}

                              {/* Seat Allocation (for proportional representation algorithms) */}
                              {election.countingResult.fullResults.result_data.allocation && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-700 mb-2">
                                    Sitzzuteilung:
                                  </p>
                                  <div className="space-y-1">
                                    {election.countingResult.fullResults.result_data.allocation.map(
                                      (candidate, idx) => (
                                        <div
                                          key={idx}
                                          className={`flex justify-between items-center p-2 rounded text-xs ${candidate.is_tie ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}
                                        >
                                          <span className="font-medium text-gray-900">
                                            {candidate.candidate ||
                                              candidate.name ||
                                              `${candidate.firstname || ''} ${candidate.lastname || ''}`.trim() ||
                                              `Option ${candidate.listnum}`}
                                          </span>
                                          <div className="text-right flex flex-col items-end">
                                            <div className="flex items-center gap-2">
                                              <span className="font-bold text-gray-900">
                                                {candidate.votes}{' '}
                                                {candidate.votes === 1 ? 'Stimme' : 'Stimmen'}
                                              </span>
                                              {candidate.seats !== undefined && (
                                                <span className="text-blue-600 font-semibold">
                                                  · {candidate.seats}{' '}
                                                  {candidate.seats === 1 ? 'Sitz' : 'Sitze'}
                                                </span>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                              {candidate.quota && (
                                                <span className="text-gray-500 text-xs">
                                                  Quote: {candidate.quota}
                                                </span>
                                              )}
                                              {candidate.is_tie && (
                                                <span className="px-1.5 py-0.5 bg-yellow-500 text-white rounded-sm text-[10px] font-semibold">
                                                  Gleichstand
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Referendum Result - Only show for Binary Format (3 options with Ja/Nein/Enthaltung) */}
                              {election.countingResult.fullResults.result_data.yes_votes !==
                                undefined && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-700 mb-2">
                                    Abstimmungsergebnis:
                                  </p>
                                  <div
                                    className={`p-2 rounded ${election.countingResult.fullResults.result_data.result === 'ACCEPTED' ? 'bg-green-100' : 'bg-red-100'}`}
                                  >
                                    <p className="font-bold text-sm">
                                      {election.countingResult.fullResults.result_data.result ===
                                      'ACCEPTED'
                                        ? '✓ ANGENOMMEN'
                                        : '✗ ABGELEHNT'}
                                    </p>
                                    <div className="mt-1 text-xs space-y-1">
                                      <div>
                                        Ja:{' '}
                                        <span className="font-semibold">
                                          {
                                            election.countingResult.fullResults.result_data
                                              .yes_votes
                                          }
                                        </span>{' '}
                                        (
                                        {
                                          election.countingResult.fullResults.result_data
                                            .yes_percentage
                                        }
                                        %)
                                      </div>
                                      <div>
                                        Nein:{' '}
                                        <span className="font-semibold">
                                          {
                                            election.countingResult.fullResults.result_data
                                              .no_votes
                                          }
                                        </span>{' '}
                                        (
                                        {
                                          election.countingResult.fullResults.result_data
                                            .no_percentage
                                        }
                                        %)
                                      </div>
                                      <div>
                                        Enthaltung:{' '}
                                        <span className="font-semibold">
                                          {
                                            election.countingResult.fullResults.result_data
                                              .abstain_votes || 0
                                          }
                                        </span>{' '}
                                        (
                                        {
                                          election.countingResult.fullResults.result_data
                                            .abstain_percentage || '0.00'
                                        }
                                        %)
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Plurality Format Tie Warning (N options) - only show tie warning, not duplicate results */}
                              {election.countingResult.fullResults.result_data.all_candidates &&
                                election.countingResult.fullResults.result_data.ties_detected && (
                                  <div className="p-2 rounded bg-yellow-100 text-xs mt-2">
                                    ⚠️ Stimmengleichheit - Manuelle Entscheidung erforderlich
                                  </div>
                                )}
                            </div>
                          )}

                        {/* Export Button - at the end of results */}
                        {election.countingResult.fullResults && (
                          <div className="mt-4 pt-4 border-t border-green-300">
                            <button
                              onClick={() =>
                                handleExportResult(election.countingResult.fullResults.id)
                              }
                              className="w-full px-4 py-3 bg-white border-2 border-green-600 text-green-700 font-semibold rounded-lg hover:bg-green-50 transition-colors flex items-center justify-center gap-2"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                              </svg>
                              Wahlergebnis als Excel exportieren
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Display */}
                {election.countingError && (
                  <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <svg
                        className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div className="flex-1">
                        <p className="font-bold text-red-900 mb-1">✗ Auszählung fehlgeschlagen</p>
                        <p className="text-sm text-red-800">{election.countingError}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Info Note */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex gap-3">
            <svg
              className="w-5 h-5 text-blue-600 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Hinweise:</p>
              <ul className="list-disc list-inside text-blue-800 space-y-1">
                <li>Die Auszählung verwendet nur aggregierte Stimmendaten (BSI-konform)</li>
                <li>Das System erkennt automatisch Stimmengleichheit und zeigt dies an</li>
                <li>
                  Bei Mehrheitswahlen wird automatisch geprüft, ob eine Stichwahl erforderlich ist
                </li>
                <li>Jede Auszählung wird mit Versionsnummer und Zeitstempel gespeichert</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CountingSection;
