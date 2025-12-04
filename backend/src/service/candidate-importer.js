/* eslint-disable security/detect-object-injection */
import { logger } from '../conf/logger/logger.js';
import { client } from '../database/db.js';
import { parseCsv, parseExcel } from '../utils/parsers.js';

/**
 * Ensures all allowed columns exist with null fallback.
 * @param {Object} row - The input row object
 * @returns {Object} The cleaned row object
 */
export const safeRow = (row) => {
  const cleaned = {};
  for (const col of allowedColumns) {
    cleaned[col] = row[col] ?? null;
  }
  return cleaned;
};

const allowedColumns = ['lastname', 'firstname', 'mtknr', 'faculty', 'keyword', 'notes'];

/**
 * Inserts an array of candidate objects into the database.
 * @param {Array<Object>} data - Array of candidate objects
 * @returns {Promise<void>}
 */
const insertCandidates = async (data) => {
  if (!data.length) {
    logger.info('No candidate data found to insert.');
    return;
  }

  const cols = allowedColumns.join(', ');
  const placeholders = data
    .map(
      (_, i) =>
        `(${allowedColumns.map((__, j) => `$${i * allowedColumns.length + (j + 1)}`).join(', ')})`,
    )
    .join(', ');

  const flatValues = data.flatMap((row) => allowedColumns.map((col) => row[col]));

  const query = {
    text: `INSERT INTO candidates (${cols}) VALUES ${placeholders}`,
    values: flatValues,
  };

  try {
    const res = await client.query(query);
    logger.info(`Inserted ${res.rowCount} candidates.`);
  } catch (err) {
    logger.error('DB insert error:', err);
    throw new Error('Database error while inserting candidates.');
  }
};

/**
 * Main entry for candidate import.
 * @param {string} path - Path to the input file
 * @param {string} mimeType - MIME type of the input file
 * @returns {Promise<void>}
 */
export const importCandidateData = async (path, mimeType) => {
  logger.debug(`Parsing candidate file: ${path} (${mimeType})`);

  // Parser mapping
  const parsers = {
    'text/csv': parseCsv,
    'application/vnd.ms-excel': parseCsv, // ältere CSV-MIME
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': parseExcel,
  };

  // Automatische Erkennung anhand Dateiendung, falls MIME falsch
  const lowerPath = path.toLowerCase();
  const isCsv = lowerPath.endsWith('.csv');
  const isXlsx = lowerPath.endsWith('.xlsx');

  const parser = parsers[mimeType] || (isCsv ? parseCsv : isXlsx ? parseExcel : null);

  if (!parser) {
    throw new Error(`Unsupported file type: ${mimeType} (${path})`);
  }

  try {
    const rawRows = await parser(path);

    const rows = rawRows.map((row) => safeRow(row));

    logger.debug(`Parsed ${rows.length} candidate rows.`);

    await insertCandidates(rows);
  } catch (err) {
    logger.error('Candidate import process error:', err);
    throw err;
  }
};
