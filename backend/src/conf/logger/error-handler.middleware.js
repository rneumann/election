import { logger } from './logger.js';

/**
 * Error handler middleware for Express.js.
 * Logs the error with the logger and responds with a 500 status code.
 * @param err - The error object.
 * @param res - The Express.js response object.
 */
export const errorHandler = (err, res) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
};
