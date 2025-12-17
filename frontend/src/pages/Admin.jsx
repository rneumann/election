/* eslint-disable indent */
/* eslint-disable sonarjs/no-duplicate-string */
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../hooks/useTheme.js';
import ResponsiveButton from '../components/ResponsiveButton.jsx';
import ValidationErrors from '../components/ValidationErrors.jsx';
import {
  validateVoterCSV,
  validateCandidateCSV,
  transformCandidateFile,
  transformVoterFile,
} from '../utils/validators/csvValidator.js';
import { validateElectionExcel } from '../utils/validators/excelValidator.js';
import { MAX_FILE_SIZE } from '../utils/validators/constants.js';
import api, { exportElectionResultExcel } from '../services/api.js';
import { logger } from '../conf/logger/logger.js';
import { templateApi } from '../services/templateApi';

/**
 * CountingSection Component - Handles election vote counting
 *
 * Features:
 * - Lists all elections that can be counted
 * - Triggers counting process via API
 * - Displays counting results with majority information
 * - Shows tie detection warnings
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
      const response = await api.get('/admin/elections?startedOnly=true&endedOnly=true');
      setElections(response.data || []);
    } catch (error) {
      setCountingError(`Fehler beim Laden der Wahlen: ${error.message}`);
    } finally {
      setLoadingElections(false);
    }
  };

  // Load elections on mount
  useEffect(() => {
    loadElections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
              ? { ...e, countingError: response.data.message || 'Auszählung fehlgeschlagen' }
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

  // Neuer Handler für den offiziellen Export
  const handleExportOfficial = async (resultId) => {
    try {
      // Wir rufen die NEUE Route auf
      const response = await api.get(`/export/results/${resultId}/official`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Amtliches_Ergebnis.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      // eslint-disable-next-line no-unused-vars
    } catch (err) {
      alert('Fehler beim Download des amtlichen Ergebnisses');
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
                                                `${candidate.firstname} ${candidate.lastname}`}
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
                                              `${candidate.firstname} ${candidate.lastname}`}
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

                              {/* Referendum Result */}
                              {election.countingResult.fullResults.result_data.result && (
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
                                          {election.countingResult.fullResults.result_data.no_votes}
                                        </span>{' '}
                                        (
                                        {
                                          election.countingResult.fullResults.result_data
                                            .no_percentage
                                        }
                                        %)
                                      </div>
                                      {election.countingResult.fullResults.result_data
                                        .abstain_votes > 0 && (
                                        <div>
                                          Enthaltung:{' '}
                                          <span className="font-semibold">
                                            {
                                              election.countingResult.fullResults.result_data
                                                .abstain_votes
                                            }
                                          </span>{' '}
                                          (
                                          {
                                            election.countingResult.fullResults.result_data
                                              .abstain_percentage
                                          }
                                          %)
                                        </div>
                                      )}
                                    </div>
                                  </div>
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

                        {/* NEUER BUTTON */}
                        <button
                          onClick={() =>
                            handleExportOfficial(election.countingResult.fullResults.id)
                          }
                          className="mt-3 w-full px-4 py-3 bg-brand-primary text-white font-bold rounded-lg hover:opacity-90 flex items-center justify-center gap-2 shadow-sm"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          Amtliches Ergebnis (HKA-Design) laden
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Display directly under election */}
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

/**
 * Admin page for uploading election definitions via Excel file.
 * Features drag & drop and file browser with validation.
 * Only accessible to users with admin role.
 *
 * @returns Excel upload interface with visual feedback and instructions
 */
const AdminUpload = () => {
  const { user, logout } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeSection, setActiveSection] = useState('upload'); // 'upload' | 'manage' | 'counting' | 'uploadCandidates'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [validationStats, setValidationStats] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [templateType, setTemplateType] = useState('generic'); // 'elections' oder 'voters'

  // const [clearingDatabase, setClearingDatabase] = useState(false);

  // Counting states
  const [elections, setElections] = useState([]);
  const [loadingElections, setLoadingElections] = useState(false);
  const [countingElectionId, setCountingElectionId] = useState(null);
  const [countingResult, setCountingResult] = useState(null);
  const [countingError, setCountingError] = useState('');

  // Redirect non-admins
  if (user?.role !== 'admin') {
    navigate('/home');
    return null;
  }

  /**
   * Validate file type and size.
   *
   * @param {File} file - File to validate
   * @param {string} fileType - Expected file type ('csv' or 'excel')
   * @returns {boolean} True if file is valid
   */
  const validateFile = (file, fileType) => {
    const csvTypes = ['text/csv'];
    const excelTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];

    if (fileType === 'csv') {
      if (!csvTypes.includes(file.type) && !file.name.endsWith('.csv')) {
        setError('Bitte laden Sie eine CSV-Datei hoch (.csv)');
        return false;
      }
    } else if (fileType === 'excel') {
      if (
        !excelTypes.includes(file.type) &&
        !file.name.endsWith('.xlsx') &&
        !file.name.endsWith('.xls')
      ) {
        setError('Bitte laden Sie eine Excel-Datei hoch (.xlsx oder .xls)');
        return false;
      }
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('Die Datei ist zu groß. Maximale Größe: 10MB');
      return false;
    }

    return true;
  };

  const handleDownloadTemplate = async () => {
    try {
      if (templateType === 'voters') {
        await templateApi.downloadVoterTemplate();
      } else {
        // Alles andere ist ein Wahl-Preset (z.B. 'stupa_verhaeltnis')
        await templateApi.downloadElectionTemplate(templateType);
      }
      setSuccess('Vorlage erfolgreich heruntergeladen');
      // eslint-disable-next-line no-unused-vars
    } catch (err) {
      setError('Fehler beim Download der Vorlage');
    }
  };

  /**
   * Handle file selection from input or drag & drop.
   * Performs immediate validation using Zod.
   *
   * @param {File} file - Selected file
   */
  const handleFileSelect = async (file) => {
    setError('');
    setSuccess('');
    setValidationErrors([]);
    setValidationStats(null);

    // Determine file type based on file extension
    const fileType = file.name.toLowerCase().endsWith('.csv') ? 'csv' : 'excel';

    if (!validateFile(file, fileType)) {
      return;
    }

    setIsValidating(true);

    try {
      let validationResult;

      if (activeSection === 'uploadCandidates') {
        if (fileType === 'csv') {
          validationResult = await validateCandidateCSV(file);
        } else {
          validationResult = { success: true, stats: { info: 'Excel wird serverseitig geprüft' } };
        }
      } else if (activeSection === 'upload') {
        validationResult = await validateVoterCSV(file);
      } else if (activeSection === 'definition') {
        validationResult = await validateElectionExcel(file);
      } else {
        validationResult = { success: true, stats: {} };
      }

      if (!validationResult.success) {
        setValidationErrors(validationResult.errors);
        setSelectedFile(null);
        setError('Die Datei enthält Validierungsfehler.');
      } else {
        setSelectedFile(file);
        setValidationStats(validationResult.stats);
        setSuccess('Datei erfolgreich validiert! Sie können nun hochladen.');
      }
    } catch (err) {
      logger.error(`Error validating file: ${err.message}`);
      setError(`Fehler bei der Validierung: ${err.message}`);
    } finally {
      setIsValidating(false);
    }
  };

  /**
   * Handle drag over event.
   *
   * @param {React.DragEvent} e - Drag event
   */
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  /**
   * Handle drag leave event.
   */
  const handleDragLeave = () => {
    setIsDragging(false);
  };

  /**
   * Handle file drop event.
   *
   * @param {React.DragEvent} e - Drop event
   */
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  /**
   * Handle browse button click.
   */
  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  /**
   * Handle file input change.
   *
   * @param {React.ChangeEvent<HTMLInputElement>} e - Input change event
   */
  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  /**
   * Handle file upload to backend.
   * Only proceeds if file passed validation.
   */
  const handleUpload = async () => {
    if (!selectedFile) {
      return;
    }

    if (validationErrors.length > 0) {
      setError('Bitte korrigieren Sie zuerst die Validierungsfehler.');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');
    setUploadProgress(0);

    // Wir starten den try-Block früher, um auch Fehler bei der Transformation abzufangen
    try {
      // 1. Transformations-Logik
      // Standardmäßig nehmen wir die ausgewählte Datei
      let fileToUpload = selectedFile;

      // Nur wenn wir im Kandidaten-Upload sind, führen wir die Transformation durch
      if (activeSection === 'uploadCandidates') {
        fileToUpload = await transformCandidateFile(selectedFile);
      } else if (activeSection === 'upload') {
        fileToUpload = await transformVoterFile(selectedFile);
      }

      const formData = new FormData();
      formData.append('file', fileToUpload);

      const csrfToken = localStorage.getItem('csrfToken') || '';

      // 3. Endpoint wählen
      let endpoint = '';
      switch (activeSection) {
        case 'upload':
          endpoint = '/upload/voters';
          break;
        case 'uploadCandidates':
          endpoint = '/upload/candidates';
          break;
        case 'definition':
          endpoint = '/upload/elections';
          break;
        default:
          throw new Error('Unbekannter Upload-Typ');
      }

      // 4. API Request senden
      const response = await api.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-CSRF-TOKEN': csrfToken,
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        },
      });

      // 5. Erfolg prüfen
      if (response.data?.success || response.status === 200 || response.status === 201) {
        setSuccess(response.data?.message || 'Datei erfolgreich hochgeladen und verarbeitet!');

        // Optional: Reset nach kurzer Verzögerung
        setTimeout(() => {
          setSelectedFile(null);
          setUploadProgress(0);
          setValidationErrors([]);
          setValidationStats(null);
          // navigate('/home');
        }, 2000);
      } else {
        throw new Error(response.data?.message || 'Upload fehlgeschlagen');
      }
    } catch (err) {
      logger.error('Upload Error');
      const errorMsg =
        err.response?.data?.message || err.message || 'Fehler beim Hochladen der Datei.';
      setError(errorMsg);
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  /**
   * Reset file selection and validation state.
   */
  const handleReset = () => {
    setSelectedFile(null);
    setError('');
    setSuccess('');
    setUploadProgress(0);
    setValidationErrors([]);
    setValidationStats(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Helper to remove duplicated logic in sidebar buttons
  const getNavButtonStyle = (section) => ({
    backgroundColor: activeSection === section ? theme.colors.primary : 'transparent',
    color: activeSection === section ? '#ffffff' : theme.colors.dark,
  });

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-brand-primary text-white shadow-lg sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Bar */}
          <div className="flex items-center justify-between py-5">
            <div className="flex items-center gap-3">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-white hover:text-gray-200"
                aria-label="Toggle menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-white">Verwaltungsbereich</h1>
                <p className="text-xs sm:text-sm text-gray-100 mt-0.5 opacity-90">
                  {user?.username} · {theme.roles[user?.role]}
                </p>
              </div>
            </div>
            <div>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm font-medium text-white hover:text-gray-200 border border-white/30 rounded hover:bg-white/10 transition-colors"
              >
                Abmelden
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Left Sidebar - Menu */}
          <aside
            className={`
            lg:w-72 lg:flex-shrink-0
            ${mobileMenuOpen ? 'block' : 'hidden lg:block'}
          `}
          >
            <div className="bg-white border border-gray-200 lg:sticky lg:top-8">
              <div className="border-b border-gray-200 px-5 py-4">
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                  Navigation
                </h2>
                <p className="text-xs text-gray-500 mt-1">Funktionen zur Wahlverwaltung</p>
              </div>

              <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
                <p className="text-xs text-gray-700 leading-relaxed">
                  Die folgende Liste enthält alle notwendigen Funktionen zur Einrichtung/Änderung
                  von Wahlen. Um eine neue Wahl einzurichten, folgen Sie einfach den Schritten in
                  der angegebenen Reihenfolge.
                </p>
              </div>

              <nav className="p-2">
                {/*NEU*/}
                <div className="mt-8 border-t pt-4">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Sicherheit
                  </div>
                  <button
                    onClick={() => navigate('/admin/audit')}
                    className="w-full text-left px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50 text-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-red-50 p-1.5 rounded-md text-brand-primary">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                          />
                        </svg>
                      </div>
                      <div>
                        <span className="block text-gray-900">Audit Logs</span>
                        <span className="text-xs text-gray-500 font-normal">
                          Sicherheitsprotokolle einsehen
                        </span>
                      </div>
                    </div>
                  </button>
                </div>

                <div className="mb-6">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Verwaltung
                  </div>
                  <button
                    onClick={() => {
                      setActiveSection('clear');
                      setMobileMenuOpen(false);
                      handleReset();
                    }}
                    style={getNavButtonStyle('clear')}
                    className="w-full text-left px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <span>Datenbank leeren</span>
                      <span className="text-xs opacity-60">1</span>
                    </div>
                  </button>
                </div>

                <div className="mb-6">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Wahlen definieren
                  </div>
                  <button
                    onClick={() => {
                      setActiveSection('template');
                      setMobileMenuOpen(false);
                      handleReset();
                    }}
                    style={getNavButtonStyle('template')}
                    className="w-full text-left px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <span>Excel-Vorlage herunterladen</span>
                      <span className="text-xs opacity-60">2.1</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setActiveSection('definition');
                      setMobileMenuOpen(false);
                      handleReset();
                    }}
                    style={getNavButtonStyle('definition')}
                    className="w-full text-left px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <span>Wahleinstellung hochladen</span>
                      <span className="text-xs opacity-60">2.2</span>
                    </div>
                  </button>
                </div>

                <div className="mb-6">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Wählerverzeichnis
                  </div>
                  <button
                    onClick={() => {
                      setActiveSection('upload');
                      setMobileMenuOpen(false);
                      handleReset();
                    }}
                    style={getNavButtonStyle('upload')}
                    className="w-full text-left px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <span>CSV-Datei hochladen</span>
                      <span className="text-xs opacity-60">3.1</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setActiveSection('download');
                      setMobileMenuOpen(false);
                      handleReset();
                    }}
                    style={getNavButtonStyle('download')}
                    className="w-full text-left px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <span>Wählerverzeichnis herunterladen</span>
                      <span className="text-xs opacity-60">3.2</span>
                    </div>
                  </button>
                </div>

                <div className="mb-6">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Kandidatenverzeichnis
                  </div>

                  {/* Upload button */}
                  <button
                    onClick={() => {
                      setActiveSection('uploadCandidates');
                      setMobileMenuOpen(false);
                      handleReset();
                    }}
                    style={getNavButtonStyle('uploadCandidates')}
                    className="w-full text-left px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <span>CSV-Datei hochladen</span>
                      <span className="text-xs opacity-60">4.1</span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setActiveSection('downloadCandidates');
                      setMobileMenuOpen(false);
                      handleReset();
                    }}
                    style={getNavButtonStyle('downloadCandidates')}
                    className="w-full text-left px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <span>Kandidatenverzeichnis herunterladen</span>
                      <span className="text-xs opacity-60">4.2</span>
                    </div>
                  </button>
                </div>

                <div>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Auszählung
                  </div>
                  <button
                    onClick={() => {
                      setActiveSection('counting');
                      setMobileMenuOpen(false);
                      handleReset();
                    }}
                    style={getNavButtonStyle('counting')}
                    className="w-full text-left px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <span>Wahlergebnisse auszählen</span>
                      <span className="text-xs opacity-60">5</span>
                    </div>
                  </button>
                </div>
              </nav>
            </div>
          </aside>

          {/* Right Content Area */}
          <div className="flex-1 w-full lg:w-auto">
            {/* Upload Section */}
            {activeSection === 'upload' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h2 className="text-xl font-bold text-gray-900">Wählerverzeichnis hochladen</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    CSV-Datei mit den Wählern hochladen. Die Datei muss aus einer Kopfzeile und den
                    folgenden, durch Komma getrennten Spalten bestehen:
                  </p>
                </div>

                <div className="p-6">
                  {/* Format Example */}
                  <div className="mb-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-xs font-mono text-gray-700 mb-2">Format-Beispiel:</p>
                    <code className="text-xs font-mono text-gray-900 block bg-white p-3 rounded border border-gray-300 overflow-x-auto">
                      RZ-Kennung,Fakultät,Vorname,Nachname,Matk.Nr,Studienganskürzel,Studiengang
                      <br />
                      abcd1234,AB,Max,Mustermann,123456,ARTB,Architektur
                    </code>
                  </div>

                  {/* Drag & Drop Zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={!selectedFile ? handleBrowseClick : undefined}
                    className={`
                      relative p-12 border-2 border-dashed rounded-lg transition-all cursor-pointer
                      ${isDragging ? 'border-brand-primary bg-blue-50 scale-[1.02]' : selectedFile ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-brand-primary hover:bg-gray-50'}
                    `}
                  >
                    {!selectedFile ? (
                      <div className="text-center">
                        <div
                          className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 transition-all ${isDragging ? 'bg-brand-primary scale-110' : 'bg-gray-100'}`}
                        >
                          <svg
                            className={`w-8 h-8 ${isDragging ? 'text-white' : 'text-gray-400'}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                          </svg>
                        </div>
                        <p className="text-lg font-semibold text-gray-900 mb-2">
                          {isDragging ? 'Datei hier ablegen...' : 'Datei hier ziehen oder klicken'}
                        </p>
                        <p className="text-sm text-gray-500 mb-4">CSV-Datei (max. 10 MB)</p>
                        <ResponsiveButton variant="outline" size="medium">
                          Datei auswählen
                        </ResponsiveButton>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500 mb-4">
                          <svg
                            className="w-8 h-8 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                        <p className="font-semibold text-green-900 mb-2">Datei bereit zum Upload</p>
                        <p className="text-sm text-gray-700 font-medium truncate max-w-md mx-auto">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                  </div>

                  {/* Validation in Progress */}
                  {isValidating && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-3">
                        <svg
                          className="animate-spin h-5 w-5 text-blue-600"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
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
                        <span className="text-sm font-medium text-blue-900">
                          Datei wird validiert...
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Validation Stats */}
                  {validationStats && validationErrors.length === 0 && (
                    <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                      <h4 className="text-sm font-bold text-green-900 mb-3">
                        ✓ Validierung erfolgreich
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {validationStats.totalVoters !== undefined && (
                          <div>
                            <span className="text-green-700 font-medium">Wähler:</span>
                            <span className="ml-2 text-green-900 font-bold">
                              {validationStats.totalVoters}
                            </span>
                          </div>
                        )}
                        {validationStats.faculties !== undefined && (
                          <div>
                            <span className="text-green-700 font-medium">Fakultäten:</span>
                            <span className="ml-2 text-green-900 font-bold">
                              {validationStats.faculties}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Validation Errors */}
                  {validationErrors.length > 0 && (
                    <ValidationErrors errors={validationErrors} fileType="CSV" />
                  )}

                  {/* Progress Bar */}
                  {uploading && uploadProgress > 0 && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium text-gray-700">Upload läuft...</span>
                        <span className="text-brand-primary font-bold">{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-brand-primary h-3 rounded-full transition-all duration-500 relative overflow-hidden"
                          style={{ width: `${uploadProgress}%` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Messages */}
                  {error && (
                    <div className="mt-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex gap-3">
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
                        <p className="font-semibold">Fehler beim Upload</p>
                        <p className="mt-1">{error}</p>
                      </div>
                    </div>
                  )}

                  {success && (
                    <div className="mt-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex gap-3">
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
                      <div className="text-sm">
                        <p className="font-semibold">Upload erfolgreich</p>
                        <p className="mt-1">{success}</p>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-6 flex gap-3">
                    {selectedFile ? (
                      <>
                        <ResponsiveButton
                          variant="primary"
                          size="large"
                          onClick={handleUpload}
                          disabled={uploading || isValidating || validationErrors.length > 0}
                          className="flex-1"
                        >
                          {uploading ? (
                            <div className="flex items-center justify-center gap-2">
                              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
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
                              <span>Wird hochgeladen...</span>
                            </div>
                          ) : validationErrors.length > 0 ? (
                            'Fehler beheben'
                          ) : (
                            'Hochladen'
                          )}
                        </ResponsiveButton>
                        <ResponsiveButton
                          variant="outline"
                          size="large"
                          onClick={handleReset}
                          disabled={uploading || isValidating}
                        >
                          Abbrechen
                        </ResponsiveButton>
                      </>
                    ) : (
                      <ResponsiveButton
                        variant="primary"
                        size="large"
                        onClick={handleBrowseClick}
                        className="flex-1"
                      >
                        Datei auswählen
                      </ResponsiveButton>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'uploadCandidates' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    Kandidatenverzeichnis hochladen
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    CSV-Datei mit Kandidaten hochladen. Die Datei muss aus einer Kopfzeile und den
                    folgenden, durch Komma getrennten Spalten bestehen:
                  </p>
                </div>

                <div className="p-6">
                  {/* Format Example */}
                  <div className="mb-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-xs font-mono text-gray-700 mb-2">Format-Beispiel:</p>
                    <code className="text-xs font-mono text-gray-900 block bg-white p-3 rounded border border-gray-300 overflow-x-auto">
                      Nachname,Vorname,MatrikelNr,Fakultät,Schlüsselworte,Notizen,IstZugelassen
                      <br />
                      Mustermann,Max,123456,AB,&quot;Umwelt,
                      Digitalisierung&quot;,&quot;Bemerkung&quot;,true
                    </code>
                  </div>

                  {/* Drag & Drop Zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={!selectedFile ? handleBrowseClick : undefined}
                    className={`
                      relative p-12 border-2 border-dashed rounded-lg transition-all cursor-pointer
                      ${
                        isDragging
                          ? 'border-brand-primary bg-blue-50 scale-[1.02]'
                          : selectedFile
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-300 hover:border-brand-primary hover:bg-gray-50'
                      }
                    `}
                  >
                    {!selectedFile ? (
                      <div className="text-center">
                        <div
                          className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 transition-all ${
                            isDragging ? 'bg-brand-primary scale-110' : 'bg-gray-100'
                          }`}
                        >
                          <svg
                            className={`w-8 h-8 ${isDragging ? 'text-white' : 'text-gray-400'}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                          </svg>
                        </div>
                        <p className="text-lg font-semibold text-gray-900 mb-2">
                          {isDragging ? 'Datei hier ablegen...' : 'Datei hier ziehen oder klicken'}
                        </p>
                        <p className="text-sm text-gray-500 mb-4">CSV-Datei (max. 10 MB)</p>
                        <ResponsiveButton variant="outline" size="medium">
                          Datei auswählen
                        </ResponsiveButton>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500 mb-4">
                          <svg
                            className="w-8 h-8 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                        <p className="font-semibold text-green-900 mb-2">Datei bereit zum Upload</p>
                        <p className="text-sm text-gray-700 font-medium truncate max-w-md mx-auto">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                  </div>

                  {/* Validation in Progress */}
                  {isValidating && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-3">
                        <svg
                          className="animate-spin h-5 w-5 text-blue-600"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
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
                        <span className="text-sm font-medium text-blue-900">
                          Datei wird validiert...
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Validation Stats */}
                  {validationStats && validationErrors.length === 0 && (
                    <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                      <h4 className="text-sm font-bold text-green-900 mb-3">
                        ✓ Validierung erfolgreich
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {validationStats.totalVoters !== undefined && (
                          <div>
                            <span className="text-green-700 font-medium">Wähler:</span>
                            <span className="ml-2 text-green-900 font-bold">
                              {validationStats.totalVoters}
                            </span>
                          </div>
                        )}
                        {validationStats.faculties !== undefined && (
                          <div>
                            <span className="text-green-700 font-medium">Fakultäten:</span>
                            <span className="ml-2 text-green-900 font-bold">
                              {validationStats.faculties}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Validation Errors */}
                  {validationErrors.length > 0 && (
                    <ValidationErrors errors={validationErrors} fileType="CSV" />
                  )}

                  {/* Progress Bar */}
                  {uploading && uploadProgress > 0 && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium text-gray-700">Upload läuft...</span>
                        <span className="text-brand-primary font-bold">{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-brand-primary h-3 rounded-full transition-all duration-500 relative overflow-hidden"
                          style={{ width: `${uploadProgress}%` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Messages */}
                  {error && (
                    <div className="mt-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex gap-3">
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
                        <p className="font-semibold">Fehler beim Upload</p>
                        <p className="mt-1">{error}</p>
                      </div>
                    </div>
                  )}

                  {success && (
                    <div className="mt-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex gap-3">
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
                      <div className="text-sm">
                        <p className="font-semibold">Upload erfolgreich</p>
                        <p className="mt-1">{success}</p>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-6 flex gap-3">
                    {selectedFile ? (
                      <>
                        <ResponsiveButton
                          variant="primary"
                          size="large"
                          onClick={handleUpload}
                          disabled={uploading || isValidating || validationErrors.length > 0}
                          className="flex-1"
                        >
                          {uploading ? (
                            <div className="flex items-center justify-center gap-2">
                              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
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
                              <span>Wird hochgeladen...</span>
                            </div>
                          ) : validationErrors.length > 0 ? (
                            'Fehler beheben'
                          ) : (
                            'Hochladen'
                          )}
                        </ResponsiveButton>
                        <ResponsiveButton
                          variant="outline"
                          size="large"
                          onClick={handleReset}
                          disabled={uploading || isValidating}
                        >
                          Abbrechen
                        </ResponsiveButton>
                      </>
                    ) : (
                      <ResponsiveButton
                        variant="primary"
                        size="large"
                        onClick={handleBrowseClick}
                        className="flex-1"
                      >
                        Datei auswählen
                      </ResponsiveButton>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Kandidatenverzeichnis herunterladen Section */}
            {activeSection === 'downloadCandidates' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    Kandidatenverzeichnis herunterladen
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Aktuelles Kandidatenverzeichnis als Excel-Dokument herunterladen (enthält ein
                    Tabellenblatt pro Fakultät/Studiengang)
                  </p>
                </div>
                <div className="p-6">
                  <div className="text-center py-8">
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
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                    </div>
                    <p className="text-gray-600 mb-6">
                      Diese Funktion wird demnächst verfügbar sein.
                    </p>
                    <ResponsiveButton variant="outline" size="medium">
                      Bald verfügbar
                    </ResponsiveButton>
                  </div>
                </div>
              </div>
            )}

            {/* Wahleinstellung hochladen Section */}
            {activeSection === 'definition' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h2 className="text-xl font-bold text-gray-900">Wahleinstellung hochladen</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Hochladen eines Excel-Dokuments mit einer Wahleinstellung. Die Datei muss das
                    gleiche Format wie die Vorlage haben.
                  </p>
                </div>

                <div className="p-6">
                  {/* Drag & Drop Zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={!selectedFile ? handleBrowseClick : undefined}
                    className={`
                      relative p-12 border-2 border-dashed rounded-lg transition-all cursor-pointer
                      ${isDragging ? 'border-brand-primary bg-blue-50 scale-[1.02]' : selectedFile ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-brand-primary hover:bg-gray-50'}
                    `}
                  >
                    {!selectedFile ? (
                      <div className="text-center">
                        <div
                          className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 transition-all ${isDragging ? 'bg-brand-primary scale-110' : 'bg-gray-100'}`}
                        >
                          <svg
                            className={`w-8 h-8 ${isDragging ? 'text-white' : 'text-gray-400'}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                          </svg>
                        </div>
                        <p className="text-lg font-semibold text-gray-900 mb-2">
                          {isDragging ? 'Datei hier ablegen...' : 'Datei hier ziehen oder klicken'}
                        </p>
                        <p className="text-sm text-gray-500 mb-4">
                          Excel-Dateien (.xlsx, .xls) max. 10 MB
                        </p>
                        <ResponsiveButton variant="outline" size="medium">
                          Datei auswählen
                        </ResponsiveButton>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500 mb-4">
                          <svg
                            className="w-8 h-8 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                        <p className="font-semibold text-green-900 mb-2">Datei bereit zum Upload</p>
                        <p className="text-sm text-gray-700 font-medium truncate max-w-md mx-auto">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                  </div>

                  {/* Validation in Progress */}
                  {isValidating && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-3">
                        <svg
                          className="animate-spin h-5 w-5 text-blue-600"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
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
                        <span className="text-sm font-medium text-blue-900">
                          Datei wird validiert...
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Validation Stats for Excel */}
                  {validationStats && validationErrors.length === 0 && (
                    <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                      <h4 className="text-sm font-bold text-green-900 mb-3">
                        ✓ Validierung erfolgreich
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {validationStats.electionName && (
                          <div className="col-span-2">
                            <span className="text-green-700 font-medium">Wahlbezeichnung:</span>
                            <span className="ml-2 text-green-900 font-bold">
                              {validationStats.electionName}
                            </span>
                          </div>
                        )}
                        {validationStats.totalCandidates !== undefined && (
                          <div>
                            <span className="text-green-700 font-medium">Kandidaten:</span>
                            <span className="ml-2 text-green-900 font-bold">
                              {validationStats.totalCandidates}
                            </span>
                          </div>
                        )}
                        {validationStats.votesPerBallot !== undefined && (
                          <div>
                            <span className="text-green-700 font-medium">Stimmen/Wahlzettel:</span>
                            <span className="ml-2 text-green-900 font-bold">
                              {validationStats.votesPerBallot}
                            </span>
                          </div>
                        )}
                        {validationStats.startDate && (
                          <div>
                            <span className="text-green-700 font-medium">Startdatum:</span>
                            <span className="ml-2 text-green-900 font-bold">
                              {validationStats.startDate}
                            </span>
                          </div>
                        )}
                        {validationStats.endDate && (
                          <div>
                            <span className="text-green-700 font-medium">Enddatum:</span>
                            <span className="ml-2 text-green-900 font-bold">
                              {validationStats.endDate}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Validation Errors for Excel */}
                  {validationErrors.length > 0 && (
                    <ValidationErrors errors={validationErrors} fileType="Excel" />
                  )}

                  {/* Progress Bar */}
                  {uploading && uploadProgress > 0 && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium text-gray-700">Upload läuft...</span>
                        <span className="text-brand-primary font-bold">{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-brand-primary h-3 rounded-full transition-all duration-500 relative overflow-hidden"
                          style={{ width: `${uploadProgress}%` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Messages */}
                  {error && (
                    <div className="mt-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex gap-3">
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
                        <p className="font-semibold">Fehler beim Upload</p>
                        <p className="mt-1">{error}</p>
                      </div>
                    </div>
                  )}

                  {success && (
                    <div className="mt-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex gap-3">
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
                      <div className="text-sm">
                        <p className="font-semibold">Upload erfolgreich</p>
                        <p className="mt-1">{success}</p>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-6 flex gap-3">
                    {selectedFile ? (
                      <>
                        <ResponsiveButton
                          variant="primary"
                          size="large"
                          onClick={handleUpload}
                          disabled={uploading || isValidating || validationErrors.length > 0}
                          className="flex-1"
                        >
                          {uploading ? (
                            <div className="flex items-center justify-center gap-2">
                              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
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
                              <span>Wird hochgeladen...</span>
                            </div>
                          ) : validationErrors.length > 0 ? (
                            'Fehler beheben'
                          ) : (
                            'Hochladen'
                          )}
                        </ResponsiveButton>
                        <ResponsiveButton
                          variant="outline"
                          size="large"
                          onClick={handleReset}
                          disabled={uploading || isValidating}
                        >
                          Abbrechen
                        </ResponsiveButton>
                      </>
                    ) : (
                      <ResponsiveButton
                        variant="primary"
                        size="large"
                        onClick={handleBrowseClick}
                        className="flex-1"
                      >
                        Datei auswählen
                      </ResponsiveButton>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Excel-Vorlage herunterladen Section */}
            {activeSection === 'template' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h2 className="text-xl font-bold text-gray-900">Excel-Vorlage herunterladen</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Excel-Vorlage für eine Wahleinstellung herunterladen
                  </p>
                </div>

                <div className="p-6">
                  {/* Download Card */}
                  <div className="bg-gray-50 border border-gray-300 rounded-lg p-8 text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-200 mb-4">
                      <svg
                        className="w-10 h-10 text-gray-600"
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
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-6">
                      Excel-Vorlage für Wahleinstellungen
                    </h3>
                    <a
                      href="/templates/ElectionInfoTemplate.xlsx"
                      download="ElectionInfoTemplate.xlsx"
                      className="inline-block"
                    >
                      <button
                        style={{ backgroundColor: theme.colors.primary }}
                        className="px-6 py-3 text-white font-medium rounded hover:opacity-90 transition-opacity"
                      >
                        <div className="flex items-center gap-2">
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
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                          </svg>
                          <span>Vorlage herunterladen (.xlsx)</span>
                        </div>
                      </button>
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Excel-Vorlage herunterladen Section */}
            {activeSection === 'template' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h2 className="text-xl font-bold text-gray-900">Excel-Vorlage herunterladen</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Wählen Sie hier die Art der Vorlage aus, die Sie benötigen.
                  </p>
                </div>

                <div className="p-6">
                  <div className="bg-gray-50 border border-gray-300 rounded-lg p-8 text-center max-w-2xl mx-auto">
                    {/* Icon */}
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white border border-gray-200 mb-6 shadow-sm">
                      <svg
                        className="w-8 h-8 text-brand-primary"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Welche Vorlage benötigen Sie?
                    </h3>

                    {/* Auswahl-Dropdown */}
                    <div className="mb-6 max-w-md mx-auto">
                      <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                        Vorlage auswählen:
                      </label>
                      <select
                        value={templateType}
                        onChange={(e) => setTemplateType(e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm p-2.5 border bg-white"
                      >
                        <optgroup label="Allgemein">
                          <option value="generic">📝 Leere Wahl-Vorlage (Standard)</option>
                          <option value="voters">👥 Wählerverzeichnis (Import)</option>
                        </optgroup>

                        <optgroup label="Studierendenparlament (StuPa)">
                          <option value="stupa_verhaeltnis">
                            🗳️ StuPa - Verhältniswahl (Sainte-Laguë)
                          </option>
                          <option value="stupa_mehrheit">🗳️ StuPa - Mehrheitswahl</option>
                        </optgroup>

                        <optgroup label="Senat">
                          <option value="senat_verhaeltnis">
                            🏛️ Senat - Verhältniswahl (Listen)
                          </option>
                          <option value="senat_mehrheit">
                            🏛️ Senat - Mehrheitswahl (Allgemein)
                          </option>
                          <option value="senat_professoren">
                            🎓 Senat - Professorenwahl (2 Sitze, Kumulieren)
                          </option>{' '}
                          {/* NEU */}
                        </optgroup>

                        <optgroup label="Fakultätsrat">
                          <option value="fakrat_verhaeltnis">
                            🎓 Fakultätsrat - Verhältniswahl
                          </option>
                          <option value="fakrat_mehrheit">🎓 Fakultätsrat - Mehrheitswahl</option>
                        </optgroup>

                        <optgroup label="Einzelwahlen & Ämter">
                          <option value="fachschaft">📢 Fachschaftsvorstand</option>
                          <option value="prorektor">
                            ⚖️ Prorektoren (Ja/Nein Bestätigung)
                          </option>{' '}
                          {/* NEU */}
                          <option value="dekan_wahlgang1">
                            👤 Dekan/Prodekan - 1. Wahlgang (Absolute Mehrheit)
                          </option>{' '}
                          {/* NEU */}
                          <option value="dekan_wahlgang2">
                            👤 Dekan/Prodekan - 2. Wahlgang (Einfache Mehrheit)
                          </option>{' '}
                          {/* NEU */}
                        </optgroup>

                        <optgroup label="Sonstige">
                          <option value="urabstimmung">🙋 Urabstimmung (Sachfragen)</option>
                        </optgroup>
                      </select>

                      {/* Hilfetext dynamisch anzeigen */}
                      <p className="text-xs text-gray-500 mt-2 text-left bg-blue-50 p-2 rounded border border-blue-100">
                        {/* Allgemein */}
                        {templateType === 'voters' &&
                          'Liste für Matrikelnummern/E-Mails aller Wahlberechtigten.'}
                        {templateType === 'generic' &&
                          'Leeres Formular für benutzerdefinierte Wahlen.'}

                        {/* StuPa */}
                        {templateType === 'stupa_verhaeltnis' &&
                          'Vorkonfiguriert: Verhältniswahl, Sainte-Laguë, Listen zulässig.'}
                        {templateType === 'stupa_mehrheit' &&
                          'Vorkonfiguriert: Mehrheitswahl (Höchststimmen), keine Listen.'}

                        {/* Senat */}
                        {templateType === 'senat_verhaeltnis' &&
                          'Vorkonfiguriert: Verhältniswahl, Hare-Niemeyer, 2 Stimmen/Kandidat.'}
                        {templateType === 'senat_mehrheit' &&
                          'Vorkonfiguriert: Mehrheitswahl, 2 Stimmen/Kandidat.'}
                        {templateType === 'senat_professoren' &&
                          'Spezialfall Professoren: Mehrheitswahl, 2 Sitze, Panaschieren/Kumulieren erlaubt.'}

                        {/* Fakultätsrat */}
                        {templateType === 'fakrat_verhaeltnis' &&
                          'Vorkonfiguriert: Verhältniswahl (Fakultätsrat).'}
                        {templateType === 'fakrat_mehrheit' &&
                          'Vorkonfiguriert: Mehrheitswahl (Fakultätsrat).'}

                        {/* Einzelwahlen & Ämter */}
                        {templateType === 'fachschaft' &&
                          'Vorkonfiguriert: Absolute Mehrheit, 1 Stimme/Person.'}
                        {templateType === 'prorektor' && 'Bestätigungswahl (Ja/Nein/Enthaltung).'}
                        {templateType === 'dekan_wahlgang1' &&
                          'Erfordert Absolute Mehrheit (>50%) der Stimmen.'}
                        {templateType === 'dekan_wahlgang2' &&
                          'Stichwahl: Einfache Mehrheit genügt.'}

                        {/* Sonstige */}
                        {templateType === 'urabstimmung' &&
                          'Vorkonfiguriert: Abstimmung über Sachfragen (Ja/Nein/Enthaltung).'}
                      </p>
                    </div>

                    {/* Download Button */}
                    <div className="flex justify-center">
                      <ResponsiveButton
                        onClick={handleDownloadTemplate}
                        variant="primary"
                        size="large"
                      >
                        <div className="flex items-center gap-2">
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
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                          </svg>
                          <span>Ausgewählte Vorlage laden</span>
                        </div>
                      </ResponsiveButton>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Wählerverzeichnis herunterladen Section */}
            {activeSection === 'download' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    Wählerverzeichnis herunterladen
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Aktuelles Wählerverzeichnis als Excel-Dokument herunterladen (enthält ein
                    Tabellenblatt pro Fakultät/Studiengang)
                  </p>
                </div>
                <div className="p-6">
                  <div className="text-center py-8">
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
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                    </div>
                    <p className="text-gray-600 mb-6">
                      Diese Funktion wird demnächst verfügbar sein.
                    </p>
                    <ResponsiveButton variant="outline" size="medium">
                      Bald verfügbar
                    </ResponsiveButton>
                  </div>
                </div>
              </div>
            )}

            {/* Einstellungen laden Section */}
            {activeSection === 'load' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h2 className="text-xl font-bold text-gray-900">Einstellungen laden</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Herunterladen der aktuellen Wahleinstellungen als Excel-Dokument
                  </p>
                </div>
                <div className="p-6">
                  <div className="text-center py-8">
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
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                    </div>
                    <p className="text-gray-600 mb-6">
                      Diese Funktion wird demnächst verfügbar sein.
                    </p>
                    <ResponsiveButton variant="outline" size="medium">
                      Bald verfügbar
                    </ResponsiveButton>
                  </div>
                </div>
              </div>
            )}

            {/* Counting Section */}
            {activeSection === 'counting' && (
              <CountingSection
                theme={theme}
                elections={elections}
                setElections={setElections}
                loadingElections={loadingElections}
                setLoadingElections={setLoadingElections}
                countingElectionId={countingElectionId}
                setCountingElectionId={setCountingElectionId}
                countingResult={countingResult}
                setCountingResult={setCountingResult}
                countingError={countingError}
                setCountingError={setCountingError}
              />
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
            <div>{theme.text.copyright}</div>
            <div>Version 1.0.0</div>
          </div>
        </div>
      </footer>

      {/* CSS for shimmer animation */}
      <style>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
};

export default AdminUpload;
