import { logger } from './logger.js';

/**
 * Error handler middleware for Express.js.
 * Logs the error with the logger and responds with a 500 status code.
 * @param err - The error object.
 * @param req - The Express.js request object.
 * @param res - The Express.js response object.
 * @param next - The next function in the middleware chain.
 */
export const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
};
