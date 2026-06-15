import { logger } from '../conf/logger/logger.js';
import api from './api';

/**
 * API-Client für Integritätsprüfungen (Blockchain-Validierung)
 */
export const integrityApi = {
  /**
   * Prüft die Audit Log Chain
   * @returns {Promise<{success: boolean, totalChecked: number, errors: array, message: string}>}
   */
  checkAuditLogChain: async () => {
    try {
      const response = await api.get('/admin/integrity/audit-log');
      return response.data;
    } catch (error) {
      logger.error('Fehler bei Audit Log Check:', error);
      throw error;
    }
  },

  /**
   * Prüft die Stimmzettel-Kette einer Wahl
   * @param {string} electionId - UUID der Wahl
   * @returns {Promise<{success: boolean, totalChecked: number, errors: array, electionInfo: object, message: string}>}
   */
  checkBallotChain: async (electionId) => {
    try {
      const response = await api.get(`/admin/integrity/ballots/${electionId}`);
      return response.data;
    } catch (error) {
      logger.error(`Fehler bei Stimmzettel Check für Wahl ${electionId}:`, error);
      throw error;
    }
  },

  /**
   * Prüft alle Wahlen
   * @returns {Promise<{success: boolean, totalElections: number, results: array, totalErrors: number, message: string}>}
   */
  checkAllBallotChains: async () => {
    try {
      const response = await api.get('/admin/integrity/all-ballots');
      return response.data;
    } catch (error) {
      logger.error('Fehler bei Prüfung aller Stimmzettel Chains:', error);
      throw error;
    }
  },
};
