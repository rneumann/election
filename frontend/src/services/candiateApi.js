import { logger } from '../conf/logger/logger';
import { hnadleHttpStatus } from '../utils/exception-handler/exception-handler';
import api from './api';

export const candidateApi = {
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

  deleteCanidateInformation: async () => {
    const response = await api.delete('candidates/information');
    logger.debug(`deleteCanidateInformation res: ${JSON.stringify(response.data)}`);
    if (response.status !== 204) {
      hnadleHttpStatus(response);
      return false;
    }
    return true;
  },

  getCandidateInfo: async (electionId) => {
    const response = await fetch(`/api/candidates/election/${electionId}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Fehler beim Laden der Kandidateninformationen');
    }
    return response.json();
  },

  getCandidateInfoByUid: async () => {
    const response = await api.get('candidates/information');
    if (response.status !== 200) {
      hnadleHttpStatus(response);
      return undefined;
    }
    return response.data;
  },
};
