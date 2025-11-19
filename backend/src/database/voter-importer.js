import fs from 'fs';
import csv from 'csv-parser';
import * as xlsx from 'xlsx';
import { client } from './db.js'; // Gehen Sie davon aus, dass dies Ihre Datenbankverbindung ist
import { logger } from '../conf/logger/logger.js';

/**
 * Parst eine CSV-Datei und gibt ein Array von Objekten zurück.
 * @param {string} path - Der Dateipfad zur CSV-Datei.
 * @returns {Promise<Object[]>} Ein Promise, das mit den geparsten Daten aufgelöst wird.
 */
function parseCsv(path) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(path)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

/**
 * Parst eine Excel-Datei und gibt ein Array von Objekten zurück (vom ersten Sheet).
 * @param {string} path - Der Dateipfad zur Excel-Datei.
 * @returns {Object[]} Die geparsten Daten.
 */
function parseExcel(path) {
  const workbook = xlsx.readFile(path);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(worksheet);
}

/**
 * Fügt Wählerdaten in die PostgreSQL-Datenbank ein.
 * @param {Object[]} data - Ein Array von Wählerobjekten.
 * @returns {Promise<void>}
 */
async function insertVoters(data) {
  if (data.length === 0) {
    logger.info('Keine Daten zum Einfügen gefunden.');
    return;
  }

  const columns = Object.keys(data[0]).join(', ');

  const valuePlaceholders = data
    .map((row, rowIdx) => {
      const values = Object.values(row)
        .map((_, colIdx) => `$${rowIdx * Object.keys(row).length + colIdx + 1}`)
        .join(', ');
      return `(${values})`;
    })
    .join(', ');

  const allValues = data.flatMap((row) => Object.values(row));

  const query = {
    text: `INSERT INTO voters (${columns}) VALUES ${valuePlaceholders}`,
    values: allValues,
  };

  try {
    // Führen Sie die Batch-Einfügung aus
    const res = await client.query(query);
    logger.info(`Erfolgreich ${res.rowCount} Wähler in die Datenbank eingefügt.`);
  } catch (error) {
    logger.error('Fehler beim Einfügen der Wählerdaten:', error);
    throw new Error('Datenbank-Fehler beim Einfügen der Wählerdaten.');
  }
}

/**
 * Importiert Wählerdaten aus der hochgeladenen Datei in die Datenbank.
 * @param {string} path - Der Dateipfad der hochgeladenen Datei.
 * @param {string} mimeType - Der MIME-Typ der Datei.
 * @returns {Promise<void>}
 */
export async function importVoterData(path, mimeType) {
  let parsedData;
  logger.debug(`Beginne mit dem Parsen der Datei: ${path} (${mimeType})`);

  try {
    if (mimeType === 'text/csv') {
      parsedData = await parseCsv(path);
    } else if (mimeType.includes('spreadsheet')) {
      parsedData = parseExcel(path);
    } else {
      throw new Error(`Unbekannter Dateityp: ${mimeType}`);
    }

    logger.debug(`Datei erfolgreich geparst. ${parsedData.length} Zeilen gefunden.`);

    await insertVoters(parsedData);
  } catch (error) {
    logger.error('Fehler im Importprozess:', error);
    throw error;
  }
}
