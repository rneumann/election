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

    if (response.status !== 200) {
      hnadleHttpStatus(response);
      return undefined;
    }
    return response.data;
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
