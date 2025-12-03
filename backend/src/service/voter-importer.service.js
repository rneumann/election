/* eslint-disable security/detect-object-injection */
import fs from 'fs';
import { logger } from '../conf/logger/logger.js';
import { client } from '../database/db.js';
import { parseCsv, parseExcel } from '../utils/parsers.js';

const allowedColumns = ['uid', 'lastname', 'firstname', 'mtknr', 'faculty', 'notes'];

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

/**
 * Inserts an array of voter objects into the database.
 * @param {Array<Object>} data - Array of voter objects
 * @returns {Promise<void>}
 */
const insertVoters = async (data) => {
  if (!data.length) {
    logger.info('No data found to insert.');
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
    text: `INSERT INTO voters (${cols}) VALUES ${placeholders}`,
    values: flatValues,
  };

  try {
    const res = await client.query(query);
    logger.info(`Inserted ${res.rowCount} voters.`);
  } catch (err) {
    logger.error('DB insert error:', err);
    throw new Error('Database error while inserting voters.');
  }
};

/**
 * Main entry for voter import.
 * @param {string} path - Path to the input file
 * @param {string} mimeType - MIME type of the input file
 * @returns {Promise<void>}
 */
export const importVoterData = async (path, mimeType) => {
  logger.debug(`Parsing file: ${path} (${mimeType})`);

  const parsers = {
    'text/csv': parseCsv,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': parseExcel,
  };

  const isSpreadsheet = mimeType.includes('spreadsheet');
  const parser = parsers[mimeType] || (isSpreadsheet ? parseExcel : null);

  if (!parser) {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }

  try {
    const rows = await parser(path);
    logger.debug(`Parsed ${rows.length} rows.`);
    await insertVoters(rows);
  } catch (err) {
    logger.error('Import process error:', err);
    throw err;
  }
};
