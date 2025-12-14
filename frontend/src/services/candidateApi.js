import { logger } from '../conf/logger/logger';
import { hnadleHttpStatus } from '../utils/exception-handler/exception-handler';
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
      hnadleHttpStatus(response);
      return [];
    }

    return response.data;
  },

  /**
   * Creates a new candidate information entry with the provided data.
   *
   * Sends a POST request to the `/candidates/information` endpoint.
   * If the request is successful (Status 201), it returns the newly created candidate information data.
   * If the request fails (non-201 status), it logs an error and returns undefined.
   *
   * @async
   * @function createCanidateInformation
   * @param {Object} data - The candidate information data to create.
   * @returns {Promise<Object|undefined>} A promise that resolves to the created candidate information data or undefined on failure.
   *
   * @example
   * Create a new candidate information entry with the provided data
   * const candidateInfo = await candidateApi.createCanidateInformation({
   *   uid: '123',
   *   info: 'Some additional information',
   *   picture: 'picture-data',
   * });
   */
  createCanidateInformation: async (data) => {
    // eslint-disable-next-line
    const response = await api.post('candidates/information', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    logger.debug(`createCanidateInformation res: ${JSON.stringify(response)}`);
    if (response.status !== 201) {
      hnadleHttpStatus(response);
      return undefined;
    }
    return response.data;
  },

  /**
   * Updates an existing candidate information entry with the provided data.
   *
   * Sends a PUT request to the `/candidates/information` endpoint.
   * If the request is successful (Status 204), it returns true.
   * If the request fails (non-204 status), it logs an error and returns false.
   *
   * @async
   * @function updateCanidateInformation
   * @param {Object} data - The candidate information data to update.
   * @returns {Promise<boolean>} A promise that resolves to true on success or false on failure.
   *
   * @example
   * Update a candidate information entry with the provided data
   * const success = await candidateApi.updateCanidateInformation({
   *   uid: '123',
   *   info: 'Some updated additional information',
   *   picture: 'updated-picture-data',
   * });
   */
  updateCanidateInformation: async (data) => {
    const response = await api.put('candidates/information', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    logger.debug(`updateCanidateInformation res: ${JSON.stringify(response.data)}`);
    if (response.status !== 204) {
      hnadleHttpStatus(response);
      return false;
    }
    return true;
  },

  /**
   * Deletes a candidate's information from the database.
   *
   * Sends a DELETE request to the `/candidates/information` endpoint.
   * If the request is successful (Status 204), it returns true.
   * If the request fails (non-204 status), it logs an error and returns false.
   *
   * @async
   * @function deleteCanidateInformation
   * @returns {Promise<boolean>} A promise that resolves to true on success or false on failure.
   */
  deleteCanidateInformation: async () => {
    const response = await api.delete('candidates/information');
    logger.debug(`deleteCanidateInformation res: ${JSON.stringify(response.data)}`);
    if (response.status !== 204) {
      hnadleHttpStatus(response);
      return false;
    }
    return true;
  },

  /**
   * Retrieves candidate information from the database.
   *
   * Sends a GET request to the `/candidates/information` endpoint.
   * If the request is successful (Status 200), it returns the candidate information data.
   * If the request fails (non-200 status), it logs an error and returns undefined.
   *
   * @async
   * @function getCandidateInfoByUid
   * @returns {Promise<Object|undefined>} A promise that resolves to the candidate information data or undefined on failure.
   */
  getCandidateInfoByUid: async (uid) => {
    const response = await api.get(`candidates/information/public/${uid}`);
    if (response.status !== 200) {
      hnadleHttpStatus(response);
      return undefined;
    }
    return response.data;
  },
};
