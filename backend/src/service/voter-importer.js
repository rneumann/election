/* eslint-disable security/detect-object-injection */
import fs from 'fs';
import csv from 'csv-parser';
import ExcelJS from 'exceljs';
import { logger } from '../conf/logger/logger.js';
import { client } from '../database/db.js';

const allowedColumns = ['uid', 'lastname', 'firstname', 'mtknr', 'faculty', 'notes'];

/**
 * Ensures all allowed columns exist with null fallback.
 */
const safeRow = (row) => {
  const cleaned = {};
  for (const col of allowedColumns) {
    cleaned[col] = row[col] ?? null;
  }
  return cleaned;
};

/**
 * Parses a CSV file into a JSON array of safe rows.
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
 * Parses an Excel file into a JSON array of safe rows.
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
    const values = row.values.slice(1);

    if (rowNumber === 1) {
      headers = values.map((h) => String(h).trim().toLowerCase());
    } else {
      const entry = {};
      values.forEach((value, idx) => {
        entry[headers[idx]] = value !== undefined ? value : null;
      });
      rows.push(safeRow(entry));
    }
  });

  return rows;
};

/**
 * Inserts an array of voter objects into the database.
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
