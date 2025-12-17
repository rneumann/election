import { useEffect } from 'react';
import api, { exportElectionResultExcel } from '../services/api';
import { adminService } from '../services/adminApi';
import CountingSection from './counting/CountingSection';

export const TestElectionCountingAdminView = ({
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
      const futureElections = await adminService.getElectionsForAdmin('future');
      setElections(futureElections || []);
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
        elections={elections}
        setElections={setElections}
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
