import fs from 'fs';
import csv from 'csv-parser';
import * as xlsx from 'xlsx';
import { logger } from '../conf/logger/logger.js';
import { client } from './db.js';

const parseCsv = (path) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(path)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
};

const parseExcel = (path) => {
  const workbook = xlsx.readFile(path);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(worksheet);
};

const insertVoters = async (data) => {
  if (data.length === 0) {
    logger.info('Keine Daten zum Einfügen gefunden.');
    return;
  }

  const allowedColumns = [
    'firstname',
    'lastname',
    'street',
    'zipcode',
    'city',
    'birthdate',
    'voter_id',
  ];

  const columns = allowedColumns.join(', ');

  const valuePlaceholders = data
    .map((_, rowIdx) => {
      const values = allowedColumns
        .map((_, colIdx) => `$${rowIdx * allowedColumns.length + colIdx + 1}`)
        .join(', ');
      return `(${values})`;
    })
    .join(', ');

  const allValues = data.flatMap((row) => allowedColumns.map((c) => row[c] ?? null));

  const query = {
    text: `INSERT INTO voters (${columns}) VALUES ${valuePlaceholders}`,
    values: allValues,
  };

  try {
    const res = await client.query(query);
    logger.info(`Erfolgreich ${res.rowCount} Wähler in die Datenbank eingefügt.`);
  } catch (error) {
    logger.error('Fehler beim Einfügen der Wählerdaten:', error);
    throw new Error('Datenbank-Fehler beim Einfügen der Wählerdaten.');
  }
};

export const importVoterData = async (path, mimeType) => {
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
};
