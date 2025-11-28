import fs from 'fs';
import csv from 'csv-parser';
import ExcelJS from 'exceljs';
import { logger } from '../conf/logger/logger.js';
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
 * Parses a CSV file into a JSON array of safe rows.
 * @param {string} path - Path to the CSV file
 * @returns {Promise<Array<Object>>} Parsed rows
 */
export const parseCsv = (path) => {
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
 * @param {string} path - Path to the Excel file
 * @returns {Promise<Array<Object>>} Parsed rows
 */
export const parseExcel = async (path) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    logger.error('Excel file contains no sheets');
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
