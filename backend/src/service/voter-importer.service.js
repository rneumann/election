/* eslint-disable security/detect-object-injection */
import fs from 'fs';
import csv from 'csv-parser';
import ExcelJS from 'exceljs';
import { logger } from '../conf/logger/logger.js';
import { client } from '../database/db.js';

/**
 * Imports required modules for file operations, CSV parsing, Excel parsing,
 * logging, and database access.
 */

const allowedColumns = ['uid', 'lastname', 'firstname', 'mtknr', 'faculty', 'notes'];

/**
 * Normalizes a raw row object into a safe, fixed-column object.
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
    notes: row.notes,
  };

  return {
    uid: r.uid ?? null,
    lastname: r.lastname ?? null,
    firstname: r.firstname ?? null,
    mtknr: r.mtknr ?? null,
    faculty: r.faculty ?? null,
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
 * Parses an Excel file (first sheet) using ExcelJS.
 * Replaces the old xlsx/SheetJS implementation.
 * @param {string} path - The path to the Excel file.
 * @returns {Promise<Object[]>} The parsed data.
 */
const parseExcel = async (path) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path);

  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    logger.warn('Excel file has no worksheets');
    return [];
  }

  const results = [];
  let headers = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell((cell, colNumber) => {
        headers[colNumber] = cell.value ? String(cell.value).trim() : '';
      });
    } else {
      const rowData = {};

      headers.forEach((headerKey, colNumber) => {
        if (!headerKey) {
          return;
        }

        const cell = row.getCell(colNumber);
        let val = cell.value;
        if (val && typeof val === 'object') {
          if (val.text) {
            val = val.text;
          } else if (val.result) {
            val = val.result;
          }
        }
        rowData[headerKey] = val !== null && val !== undefined ? String(val) : null;
      });

      results.push(safeRow(rowData));
    }
  });

  return results;
};

/**
 * Creates votingnotes entries for all imported voters for a specific election.
 * This links voters to an election, allowing them to participate in that election.
 * @param {string[]} uids - Array of voter UIDs (e.g., 'abcd1234').
 * @param {string} electionId - UUID of the election to assign voters to.
 * @returns {Promise<number>} Number of votingnotes entries created.
 */
const createVotingNotes = async (uids, electionId) => {
  if (uids.length === 0) {
    logger.info('No voters to create votingnotes for.');
    return 0;
  }

  // Insert votingnotes for all voters in the given election
  // Uses subquery to get voter UUIDs from their UIDs
  const query = {
    text: `
      INSERT INTO votingnotes (voterId, electionId, voted)
      SELECT v.id, $1, false
      FROM voters v
      WHERE v.uid = ANY($2)
      ON CONFLICT (voterId, electionId) DO NOTHING
    `,
    values: [electionId, uids],
  };

  try {
    const res = await client.query(query);
    logger.info(`Created ${res.rowCount} votingnotes entries for election ${electionId}`);
    return res.rowCount;
  } catch (error) {
    logger.error('Error creating votingnotes:', error);
    throw new Error('Database error while creating votingnotes.');
  }
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
    row.notes,
  ]);

  const query = {
    text: `INSERT INTO voters (${columns}) VALUES ${valuePlaceholders} ON CONFLICT (uid) DO NOTHING`,
    values: allValues,
  };

  try {
    const res = await client.query(query);
    logger.info(
      `Successfully inserted ${res.rowCount} new voters into the database (existing voters were skipped).`,
    );
  } catch (error) {
    logger.error('Error inserting voter data into the database:', error);
    throw new Error('Database error while inserting voter data.');
  }
};

/**
 * Imports voter data from CSV or Excel files, parses it, and loads it into the database.
 * If an electionId is provided, creates votingnotes to assign voters to that election.
 * Only safe MIME types are supported.
 * @param {string} path - The file path of the uploaded file.
 * @param {string} mimeType - The MIME type of the file.
 * @param {string} electionId - UUID of the election to assign voters to.
 * @returns {Promise<{voterCount: number, votingNotesCount: number}>} Import statistics.
 */
export const importVoterData = async (path, mimeType, electionId) => {
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

    if (rows.length > 0) {
      logger.debug('Parsed Excel/CSV Row Sample:', JSON.stringify(rows[0]));
    }

    await insertVoters(rows);

    // Create votingnotes to assign voters to the election
    const uids = rows.map((row) => row.uid).filter(Boolean);
    const votingNotesCount = await createVotingNotes(uids, electionId);

    return {
      voterCount: rows.length,
      votingNotesCount,
    };
  } catch (err) {
    logger.error('Import process error:', err);
    throw err;
  }
};
