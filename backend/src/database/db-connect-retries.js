import { logger } from '../conf/logger/logger.js';
import { writeAuditLog } from '../audit/auditLogger.js';

/**
 * Creates a promise that resolves after a specified delay.
 * @param {number} ms - The delay in milliseconds.
 * @returns {Promise<void>} A promise that resolves after the specified delay.
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Establishes a connection to the PostgreSQL database with a specified
 * number of retries on failure.
 * @param {function} connectFn - The function to call to establish the
 *   database connection.
 * @param {object} options - An object containing the following properties:
 *   - retries: The maximum number of connection attempts. Defaults to 10.
 *   - initialDelayMs: The initial delay in milliseconds before the first
 *     retry. Defaults to 2000ms.
 *   - backoffFactor: The factor to multiply the delay by on each subsequent
 *     retry. Defaults to 1.5.
 * @returns {Promise<void>} A promise that resolves when the database connection
 *   is established or rejects when the maximum number of retries is exceeded.
 */
/**
 *
 * @param connectFn
 * @param root0
 * @param root0.retries
 * @param root0.initialDelayMs
 * @param root0.backoffFactor
 */
export const connectDbWithRetry = async (
  connectFn,
  { retries = 5, initialDelayMs = 2000, backoffFactor = 1.5 } = {},
) => {
  let attempt = 1;
  let delay = initialDelayMs;

  while (attempt <= retries) {
    try {
      logger.info(`DB connection attempt ${attempt}/${retries}`);
      await connectFn();

      logger.info('DB connection established');

      await writeAuditLog({
        actionType: 'DB_CONNECTION_SUCCESS',
        level: 'INFO',
        actorId: 'system',
        actorRole: 'system',
        details: { attempt },
      });

      return;
    } catch (err) {
      logger.warn(`DB connection attempt ${attempt} failed: ${err.message}`);

      await writeAuditLog({
        actionType: 'DB_CONNECTION_FAILED',
        level: 'WARN',
        actorId: 'system',
        actorRole: 'system',
        details: {
          attempt,
          error: err.message,
          nextRetryInMs: delay,
        },
      }).catch(() => {});

      if (attempt === retries) {
        logger.error('DB connection failed after maximum retries');

        await writeAuditLog({
          actionType: 'DB_CONNECTION_ABORT',
          level: 'ERROR',
          actorId: 'system',
          actorRole: 'system',
          details: { retries },
        }).catch(() => {});

        throw err;
      }

      await sleep(delay);
      delay = Math.floor(delay * backoffFactor);
      attempt++;
    }
  }
};
