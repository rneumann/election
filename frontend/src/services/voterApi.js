import { logger } from '../conf/logger/logger';
import api from './api';

export const voterApi = {
  getElections: async (status, voterId) => {
    const response = await api.get(
      `voter/${voterId}/elections${status ? `?status=${status}` : ''}`,
    );
    logger.debug(`url: voter/${voterId}/elections${status ? `?status=${status}` : ''}`);
    if (!response) {
      logger.error('Error retrieving elections');
    }
    const data = await response.data;
    logger.debug(`getElections res: ${JSON.stringify(data)}`);
    return data;
  },

  getElectionById: async (id) => {
    if (!id) {
      logger.error('No election id provided');
      return;
    }
    const response = await api.get(`voter/elections/${id}`);
    if (!response) {
      logger.error('Error retrieving election');
    }
    const data = await response.data;
    logger.debug(`getElectionById res: ${JSON.stringify(data)}`);
    return data;
  },
};
