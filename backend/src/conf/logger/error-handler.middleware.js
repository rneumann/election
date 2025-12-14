// NEU: Audit Import (Pfade beachten!)
import { writeAuditLog } from '../../audit/auditLogger.js';
import { logger } from './logger.js';

/**
 * Error handler middleware function.
 * Logs the error with the message, stack and the path of the request.
 * Responds with a 500 Internal Server Error status and a JSON body containing the error 'Internal Server Error'.
 * @param {Error} err - the error object
 * @param {Request} req - the Express request object
 * @param {Response} res - the Express response object
 * @param {() => void} next - the Express next function
 */
/* eslint-disable */
export const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
  });

  // NEU: Audit Log (Systemabsturz/Unhandled Exception)
  writeAuditLog({
    actionType: 'UNHANDLED_EXCEPTION',
    level: 'FATAL',
    actorId: req.user ? req.user.username : 'system',
    details: {
      error_message: err.message,
      path: req.path,
      method: req.method,
    },
  }).catch((e) => logger.error('Audit Log failed:', e));

  res.status(500).json({ error: 'Internal Server Error' });
};
