import fs from 'fs';
import csv from 'csv-parser';
import ExcelJS from 'exceljs';
import { logger } from '../conf/logger/logger.js';
import { client } from './db.js';

const allowedColumns = ['uid', 'lastname', 'firstname', 'mtknr', 'faculty', 'votergroup', 'notes'];

/**
 * Cleans a row object by ensuring all allowed columns exist and are not undefined.
 *
 * @param {Object} row - The input row object from CSV or Excel
 * @returns {Object} A row object with all allowed columns, defaulting to null if missing
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
 * Parses a CSV file into a JSON array of safe rows.
 *
 * @param {string} path - Path to the CSV file
 * @returns {Promise<Object[]>} Parsed rows from the CSV file
 */
const parseCsv = (path) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(path)
      .pipe(csv())
      .on('data', (data) => results.push(safeRow(data)))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
};

/**
 * Parses an Excel file into a JSON array of safe rows using exceljs.
 *
 * @param {string} path - Path to the Excel file
 * @returns {Promise<Object[]>} Parsed rows from the Excel file
 * @throws Will throw an error if the file has no worksheets
 */
const parseExcel = async (path) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path);

  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    throw new Error('Excel file contains no sheets');
  }

  const rows = [];
  let headers = [];

  worksheet.eachRow((row, rowNumber) => {
    const values = row.values;

    // exceljs includes a null value at index 0 → remove
    const clean = values.slice(1);

    if (rowNumber === 1) {
      // header row
      headers = clean.map((h) => String(h).trim().toLowerCase());
    } else {
      const entry = {};
      clean.forEach((value, idx) => {
        entry[headers[idx]] = value !== undefined ? value : null; // eslint-disable-line security/detect-object-injection
      });
      rows.push(safeRow(entry));
    }
  });

  return rows;
};

/**
 * Inserts an array of voter objects into the database.
 *
 * @param {Object[]} data - Array of voter objects with keys matching allowedColumns
 * @returns {Promise<void>}
 * @throws Will throw an error if the database insertion fails
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
 * Main function to import voter data from a CSV or Excel file.
 *
 * Determines file type by MIME type, parses the file, and inserts rows into the database.
 *
 * @param {string} path - Path to the file to import
 * @param {string} mimeType - MIME type of the file (e.g., 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
 * @returns {Promise<void>}
 * @throws Will throw an error if the file type is unsupported, parsing fails, or database insertion fails
 */
export const importVoterData = async (path, mimeType) => {
  let parsedData;
  logger.debug(`Starting to parse file: ${path} (${mimeType})`);

  try {
    if (mimeType === 'text/csv') {
      parsedData = await parseCsv(path);
    } else if (mimeType.includes('spreadsheet')) {
      parsedData = await parseExcel(path);
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
