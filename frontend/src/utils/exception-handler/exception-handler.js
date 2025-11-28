import { logger } from '../../conf/logger/logger';

export const hnadleHttpStatus = (response) => {
  if (response.status === 400) {
    logger.error('Bad request');
    throw new Error('Bad request');
  }
  if (response.status === 401) {
    logger.error('Unauthorized');
    throw new Error('Unauthorized');
  }
  if (response.status === 403) {
    logger.error('Forbidden');
    throw new Error('Forbidden');
  }
  if (response.status === 404) {
    logger.error('Not found');
    throw new Error('Not found');
  }
  if (response.status === 409) {
    logger.error('Conflict');
    throw new Error('Conflict');
  }
  if (response.status === 415) {
    logger.error('Unsupported media type');
    throw new Error('Unsupported media type');
  }
  logger.error('Internal server error');
  throw new Error('Internal server error');
};
