import { logger } from '../conf/logger/logger';
import api from './api';

/**
 * Service module for handling candidate-related API interactions.
 * Provides methods to retrieve candidate data associated with elections.
 */
export const candidateApi = {
  /**
   * Fetches detailed information for all candidates participating in a specific election.
   *
   * Sends a GET request to the `/candidates/election/{electionId}` endpoint.
   * If the request is successful (Status 200), it returns the candidate data.
   * If the request fails (non-200 status), it logs an error and returns an empty array.
   *
   * @async
   * @function getCandidateInfo
   * @param {string|number} electionId - The unique identifier of the election to fetch candidates for.
   * @returns {Promise<Array<Object>|Object>} A promise that resolves to the candidate data (typically a list of candidate objects) or an empty array on failure.
   *
   * @example
   * Fetch candidates for election with ID 5
   * const candidates = await candidateApi.getCandidateInfo(5);
   */
  getCandidateInfo: async (electionId) => {
    const response = await api.get(`/candidates/election/${electionId}`);

    if (response.status !== 200) {
      logger.error(`Error fetching candidate info: ${response.status}`);
      return [];
    }

    return response.data;
  },
};
