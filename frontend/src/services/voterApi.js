import { logger } from '../conf/logger/logger';
import { hnadleHttpStatus } from '../utils/exception-handler/exception-handler';
import api from './api';

export const voterApi = {
  getElections: async (status, voterId, alreadyVoted) => {
    logger.debug(
      `send request with url: voter/${voterId}/elections${status ? `?status=${status}` : ''}${
        alreadyVoted !== undefined ? `${status ? '&' : '?'}alreadyVoted=${alreadyVoted}` : ''
      }`,
    );
    const response = await api.get(
      `voter/${voterId}/elections${status ? `?status=${status}` : ''}${
        alreadyVoted !== undefined ? `${status ? '&' : '?'}alreadyVoted=${alreadyVoted}` : ''
      }`,
    );
    if (response.status !== 200) {
      hnadleHttpStatus(response);
      return [];
    }
    const data = await response.data;
    //logger.debug(`getElections res: ${JSON.stringify(data)}`);
    return data;
  },

  getElectionById: async (id) => {
    if (!id) {
      logger.error('No election id provided');
      return;
    }
    const response = await api.get(`voter/elections/${id}`);

    if (response.status !== 200) {
      hnadleHttpStatus(response);
      return undefined;
    }
    const data = await response.data;
    //logger.debug(`getElectionById res: ${JSON.stringify(data)}`);
    return data;
  },

  createBallot: async (ballotSchema, voterUid) => {
    if (!ballotSchema || !voterUid) {
      logger.error('No ballot schema provided');
      return;
    }
    const response = await api.post(`voter/${voterUid}/ballot`, ballotSchema);
    if (response.status !== 201) {
      hnadleHttpStatus(response);
      return undefined;
    }
    logger.debug(`createBallot res: ${JSON.stringify(response.data)}`);
    return response.data;
  },
};
