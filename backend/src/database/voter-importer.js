import fs from 'fs';
import csv from 'csv-parser';
import * as xlsx from 'xlsx';
import { logger } from '../conf/logger/logger.js';
import { client } from './db.js';

/**
 * Imports required modules for file operations, CSV parsing, Excel parsing,
 * logging, and database access.
 */

const allowedColumns = ['uid', 'lastname', 'firstname', 'mtknr', 'faculty', 'votergroup', 'notes'];

/**
 * Normalizes a raw row object into a safe, fixed-column object. (Eslint.)
 * @param {Object} row
 * @returns {Object}
 */
const safeRow = (row) => {
  const r = {
    uid: row.uid,
    lastname: row.lastname,
    firstname: row.firstname,
    mtknr: row.mtknr,
    faculty: row.faculty,
    votergroup: row.votergroup,
    notes: row.notes,
  };

  return {
    uid: r.uid ?? null,
    lastname: r.lastname ?? null,
    firstname: r.firstname ?? null,
    mtknr: r.mtknr ?? null,
    faculty: r.faculty ?? null,
    votergroup: r.votergroup ?? null,
    notes: r.notes ?? null,
  };
};
/**
 * Parses a CSV file and returns an array of objects.
 * @param {string} path - The path to the CSV file.
 * @returns {Promise<Object[]>} A promise resolved with all rows as objects.
 */
const parseCsv = (path) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(path)
      .pipe(csv())
      .on('data', (data) => {
        results.push(safeRow(data));
      })
      .on('end', () => resolve(results))
      .on('error', reject);
  });
};

/**
 * Parses an Excel file (first sheet) and returns an array of objects.
 * @param {string} path - The path to the Excel file.
 * @returns {Object[]} The parsed data.
 *  */
const parseExcel = (path) => {
  const workbook = xlsx.readFile(path);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  return xlsx.utils.sheet_to_json(worksheet).map((row) => safeRow(row));
};

/**
 * Inserts validated voter data into the PostgreSQL database.
 * Only whitelisted columns are accepted to prevent object injection.
 * @param {Object[]} data - An array of voter objects.
 * @returns {Promise<void>}
 */
const insertVoters = async (data) => {
  if (data.length === 0) {
    logger.info('No data found to insert.');
    return;
  }

  const columns = allowedColumns.join(', ');
  const numColumns = allowedColumns.length;
  const valuePlaceholders = data
    .map((_, rowIdx) => {
      const startIdx = rowIdx * numColumns + 1;
      const values = Array.from(
        { length: numColumns },
        (_, colIdx) => `$${startIdx + colIdx}`,
      ).join(', ');
      return `(${values})`;
    })
    .join(', ');

  const allValues = data.flatMap((row) => [
    row.uid,
    row.lastname,
    row.firstname,
    row.mtknr,
    row.faculty,
    row.votergroup,
    row.notes,
  ]);

  const query = {
    text: `INSERT INTO voters (${columns}) VALUES ${valuePlaceholders}`,
    values: allValues,
  };

  try {
    const res = await client.query(query);
    logger.info(`Successfully inserted ${res.rowCount} voters into the database.`);
  } catch (error) {
    logger.error('Error inserting voter data into the database:', error);
    throw new Error('Database error while inserting voter data.');
  }
};

/**
 * Imports voter data from CSV or Excel files, parses it, and loads it into the database.
 * Only safe MIME types are supported.
 * @param {string} path - The file path of the uploaded file.
 * @param {string} mimeType - The MIME type of the file.
 * @returns {Promise<void>}
 */
export const importVoterData = async (path, mimeType) => {
  let parsedData;
  logger.debug(`Starting to parse file: ${path} (${mimeType})`);

  try {
    if (mimeType === 'text/csv') {
      parsedData = await parseCsv(path);
    } else if (mimeType.includes('spreadsheet')) {
      parsedData = parseExcel(path);
    } else {
      throw new Error(`Unknown file type: ${mimeType}`);
    }

    logger.debug(`File successfully parsed. ${parsedData.length} rows found.`);

    await insertVoters(parsedData);
  } catch (error) {
    logger.error('Error during import process:', error);
    throw error;
  }
};
