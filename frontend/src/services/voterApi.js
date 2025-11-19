import { logger } from '../conf/logger/logger';
import api from './api';

export const voterApi = {
  getElections: async () => {
    const response = await api.get('voter/elections');
    if (!response) {
      logger.error('Error retrieving elections');
    }
    const data = await response.data;
    logger.debug(`getElections res: ${JSON.stringify(data)}`);
    return data;
  },
};
