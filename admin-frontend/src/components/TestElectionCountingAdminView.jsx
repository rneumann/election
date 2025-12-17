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
      setFutureElections(futureElections || []);
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
