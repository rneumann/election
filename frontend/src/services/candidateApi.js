import { logger } from '../conf/logger/logger';
import { handleHttpStatus } from '../utils/exception-handler/exception-handler';
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
      handleHttpStatus(response);
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
      handleHttpStatus(response);
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
      handleHttpStatus(response);
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
      handleHttpStatus(response);
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
   * @param uid - Represents the UID of the candidate.
   * @async
   * @function getCandidateInfoByUid
   * @returns {Promise<Object|undefined>} A promise that resolves to the candidate information data or undefined on failure.
   */
  getCandidateInfoByUid: async (uid) => {
    const response = await api.get(`candidates/information/public/${uid}`);
    if (response.status !== 200) {
      handleHttpStatus(response);
      return undefined;
    }
    return response.data;
  },

  /**
   * Retrieves candidate option information by number.
   *
   * Sends a GET request to the `/candidates/information/option/public/{nr}` endpoint.
   * If the request is successful (Status 200), it returns the candidate option information data.
   * If the request fails (non-200 status), it logs an error and returns undefined.
   *
   * @param {number} nr - The number of the candidate option to fetch.
   * @async
   * @function getOptionInformationByNr
   * @returns {Promise<Object|undefined>} A promise that resolves to the candidate option information data or undefined on failure.
   */
  getOptionInformationByNr: async (nr) => {
    const response = await api.get(`candidates/information/option/public/${nr}`);
    if (response.status !== 200) {
      handleHttpStatus(response);
      return undefined;
    }
    return response.data;
  },

  /**
   * Retrieves candidate option information entries for a specific election.
   *
   * Sends a GET request to the `/candidates/information/option/public/election/{electionId}` endpoint.
   * If the request is successful (Status 200), it returns the candidate option information data.
   * If the request fails (non-200 status), it logs an error and returns undefined.
   *
   * @param {number} electionId - The ID of the election to fetch candidate option information for.
   * @async
   * @function getOptionsForElection
   * @returns {Promise<Array<Object>|undefined>} A promise that resolves to the candidate option information data or undefined on failure.
   */
  getOptionsForElection: async (electionId) => {
    const response = await api.get(`candidates/information/option/public/election/${electionId}`);
    if (response.status !== 200) {
      handleHttpStatus(response);
      return undefined;
    }
    return response.data;
  },

  /**
   * Retrieves the candidate information entry for the currently logged-in user.
   *
   * Sends a GET request to the `/candidates/information/personal` endpoint.
   * If the request is successful (Status 200), it returns the candidate information data.
   * If the request fails (non-200 status), it logs an error and returns undefined.
   *
   * @async
   * @function getCandidateInfoPersonal
   * @returns {Promise<Object|undefined>} A promise that resolves to the candidate information data or undefined on failure.
   */
  getCandidateInfoPersonal: async () => {
    const response = await api.get('candidates/information/personal');
    if (response.status !== 200) {
      handleHttpStatus(response);
      return undefined;
    }
    return response.data;
  },

  /**
   * Retrieves the list number for a specific option candidate.
   *
   * Sends a GET request to the `/information/option/listnum` endpoint.
   * If the request is successful (Status 200), it returns the list number of the candidate.
   * If the request fails (non-200 status), it logs an error and returns undefined.
   *
   * @param {string} uid - The user ID of the candidate to fetch the list number for.
   * @param {string} electionId - The identifier of the election to fetch the list number for.
   * @returns {Promise<number|undefined>} A promise that resolves to the list number of the candidate if the request is successful, or undefined on failure.
   */
  getOptionListNum: async (uid, electionId) => {
    const response = await api.get('candidates/information/option/listnum', {
      params: { uid: uid, electionId: electionId },
    });
    if (response.status !== 200) {
      handleHttpStatus(response);
      return undefined;
    }
    return response.data;
  },
};
