import { useEffect, useState } from 'react';
import { adminService } from '../services/adminApi';
import CountingSection from './counting/CountingSection';

export const TestElectionCountingAdminView = ({
  theme,
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
  const [futureElections, setFutureElections] = useState([]);

  const loadElections = async () => {
    setLoadingElections(true);
    setCountingError('');

    try {
      const futureElections = await adminService.getElectionsForAdmin('future');

      // Populate countingResult from database for finalized test elections
      const electionsWithResults = futureElections.map((election) => {
        if (election.is_final && election.result_id) {
          return {
            ...election,
            countingResult: {
              algorithm: election.result_algorithm,
              version: election.result_version,
              counted_at: election.result_counted_at,
              fullResults: {
                id: election.result_id,
                election_id: election.id,
                version: election.result_version,
                is_final: election.is_final,
                counted_at: election.result_counted_at,
                counted_by: election.counted_by,
              },
            },
          };
        }
        return election;
      });

      setFutureElections(electionsWithResults || []);
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

  return (
    <div>
      <CountingSection
        theme={theme}
        elections={futureElections}
        setElections={setFutureElections}
        loadingElections={loadingElections}
        setLoadingElections={setLoadingElections}
        countingElectionId={countingElectionId}
        setCountingElectionId={setCountingElectionId}
        countingError={countingError}
        setCountingError={setCountingError}
      />
    </div>
  );
};
