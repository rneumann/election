import { hnadleHttpStatus } from '../utils/exception-handler/exception-handler';
import api from './api';

export const candidateApi = {
  createCanidateInformation: async (data) => {
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
};
