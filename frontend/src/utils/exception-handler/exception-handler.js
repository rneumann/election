import { logger } from '../../conf/logger/logger';

export const hnadleHttpStatus = (response) => {
  logger.debug(`handleHttpStatus res: ${JSON.stringify(response.status)}`);
  if (response.status === 400) {
    logger.error('Bad request');
    return;
  }
  if (response.status === 401) {
    logger.error('Unauthorized');
    return;
  }
  if (response.status === 403) {
    logger.error('Forbidden');
    return;
  }
  if (response.status === 404) {
    logger.error('Not found');
    return;
  }
  if (response.status === 409) {
    logger.error('Conflict');
    return;
  }
  if (response.status === 415) {
    logger.error('Unsupported media type');
    return;
  }
  logger.error('Internal server error');
  return;
};
