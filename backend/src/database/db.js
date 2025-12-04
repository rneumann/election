import dotenv from 'dotenv';
import pg from 'pg';
import { logger } from '../conf/logger/logger.js';
// NEU: Audit Import
import { writeAuditLog } from '../audit/auditLogger.js';

dotenv.config();

/**
 * PostgreSQL database client.
 * Creates a new database connection using environment variables.
 *
 * Expected .env variables:
 * - DB_HOST: Hostname or IP address of the database server
 * - DB_PORT: Port number (default: 5432)
 * - DB_USER: Username for authentication
 * - DB_PASSWORD: Password for authentication
 * - DB_NAME: Name of the target database
 */
const port = 5432;

/**
 * Exported PostgreSQL client instance.
 * Can be imported throughout the application to execute queries.
 */
export const client = new pg.Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : port,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

/**
 * Establishes a connection to the PostgreSQL database and verifies it.
 *
 * - Connects to the database using the configured client.
 * - Executes a simple `SELECT NOW()` query to confirm the connection.
 * - Logs success or failure messages via the Winston logger.
 *
 * @returns {Promise<void>} Resolves when the connection is successfully established.
 * @throws Terminates the process with exit code 1 if a connection error occurs.
 */
export const connectDb = async () => {
  try {
    const { rows } = await client.query('SELECT NOW() AS now');
    logger.info('Connected to the database successfully');
    logger.info(`Database time: ${rows[0].now}`);
  } catch (err) {
    logger.error(`Database connection error: ${err.stack}`);

    // NEU: Audit Log (DB Verbindungsfehler - Fatal!)
    await writeAuditLog({
      actionType: 'DB_CONNECTION_FAILURE',
      level: 'FATAL',
      details: { error: err.message },
    }).catch(() => {});

    process.exit(1);
  }
};

/**
 * Runs a SQL query with parameters and logs errors gracefully.
 *
 * @param {string} sql
 * @param {Array<any>} params
 * @returns {Promise<pg.QueryResult>} Result of the query execution.
 * @throws Rethrows any error encountered during query execution after logging it.
 */
export const safeQuery = async (sql, params = []) => {
  try {
    return await client.query(sql, params);
  } catch (err) {
    logger.error('DB query failed:', err);
    throw err;
  }
};
