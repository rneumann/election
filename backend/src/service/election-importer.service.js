import ExcelJS from 'exceljs';
import { logger } from '../conf/logger/logger.js';
import { client } from '../database/db.js';

const ELECTION_TYPE_MAPPING = new Map([
  ['Mehrheitswahl', 'majority_vote'],
  ['Verhältniswahl', 'proportional_representation'],
  ['Urabstimmung', 'referendum'],
]);

const COUNTING_METHOD_MAPPING = new Map([
  ['Sainte-Laguë', 'sainte_lague'],
  ['Hare-Niemeyer', 'hare_niemeyer'],
  ['Einfache Mehrheit', 'highest_votes_simple'],
  ['Absolute Mehrheit', 'highest_votes_absolute'],
  ['Ja/Nein/Enthaltung', 'yes_no_referendum'],
]);

/**
 * Imports election data from an Excel file into the database.
 * Parses the Excel file row by row and inserts valid elections.
 *
 * @param {string} filePath - Path to the Excel file
 * @returns {Promise<number>} Number of successfully imported elections
 * @throws {Error} If file reading fails or validation errors occur
 */
export const importElectionData = async (filePath) => {
  const db = await client.connect();

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new Error('Die Excel-Datei enthält keine Arbeitsblätter.');
    }

    const startDateStr = sheet.getCell('D3').value;
    const endDateStr = sheet.getCell('D4').value;

    if (!startDateStr || !endDateStr) {
      throw new Error('Start- oder Enddatum fehlt (erwartet in Zellen D3 und D4).');
    }

    const startDate = parseDate(startDateStr);
    const endDate = parseDate(endDateStr);

    logger.info(`Importiere Wahlen für Zeitraum: ${startDate} -> ${endDate}`);

    await db.query('BEGIN');

    let rowIndex = 8;
    let importedCount = 0;

    while (sheet.getCell(`A${rowIndex}`).value) {
      const identifier = sheet.getCell(`A${rowIndex}`).value?.toString();
      const info = sheet.getCell(`B${rowIndex}`).value?.toString() || '';

      const listValRaw = sheet.getCell(`C${rowIndex}`).value;
      const listvotes =
        listValRaw == 1 || listValRaw == '1' || listValRaw === true ? 1 : parseInt(listValRaw) || 0;

      const seatsValue = sheet.getCell(`D${rowIndex}`).value;
      const votesPerBallotValue = sheet.getCell(`E${rowIndex}`).value;
      const maxKumValue = sheet.getCell(`F${rowIndex}`).value;

      const electionTypeText = sheet.getCell(`G${rowIndex}`).value?.toString().trim();
      const countingMethodText = sheet.getCell(`H${rowIndex}`).value?.toString().trim();

      const seatsToFill = Number(seatsValue);
      // Fallback: Wenn Spalte E leer ist, nehmen wir Plätze
      const votesPerBallot = votesPerBallotValue ? Number(votesPerBallotValue) : seatsToFill;
      const maxCumulativeVotes = Number(maxKumValue) || 0;

      // Validierungen
      if (!Number.isInteger(seatsToFill) || seatsToFill < 1) {
        throw new Error(`Zeile ${rowIndex}: 'Plätze' (Spalte D) ungültig: ${seatsValue}`);
      }

      if (!electionTypeText) {
        throw new Error(`Zeile ${rowIndex}: 'Wahltyp' fehlt (Spalte G).`);
      }
      const electionType = ELECTION_TYPE_MAPPING.get(electionTypeText);
      if (!electionType) {
        throw new Error(`Zeile ${rowIndex}: Unbekannter Wahltyp '${electionTypeText}'`);
      }

      if (!countingMethodText) {
        throw new Error(`Zeile ${rowIndex}: 'Zählverfahren' fehlt (Spalte H).`);
      }
      const countingMethod = COUNTING_METHOD_MAPPING.get(countingMethodText);
      if (!countingMethod) {
        throw new Error(`Zeile ${rowIndex}: Unbekanntes Zählverfahren '${countingMethodText}'`);
      }

      logger.info(`Zeile ${rowIndex}: Importiere "${identifier}" (${electionType})`);

      const insertElectionQuery = `
        INSERT INTO elections (
          info, description, listvotes, seats_to_fill, votes_per_ballot, 
          max_cumulative_votes, start, "end", election_type, counting_method
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id;
      `;

      await db.query(insertElectionQuery, [
        info,
        identifier,
        listvotes,
        seatsToFill,
        votesPerBallot,
        maxCumulativeVotes,
        startDate,
        endDate,
        electionType,
        countingMethod,
      ]);

      rowIndex++;
      importedCount++;
    }

    await db.query('COMMIT');
    logger.info(`Import fertig: ${importedCount} Wahlen importiert.`);

    return importedCount;
  } catch (err) {
    await db.query('ROLLBACK');
    logger.error('Fehler beim Excel-Import:', err);
    throw err;
  } finally {
    db.release();
  }
};

/**
 * Parse a date from a string or Date object.
 *
 * @param {string|Date} value - The date value to parse
 * @returns {Date} The parsed Javascript Date object
 */
const parseDate = (value) => {
  if (value instanceof Date) {
    return value;
  }
  const s = String(value).trim();
  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) {
    return new Date(`${m[3]}-${m[2]}-${m[1]}`);
  }
  return new Date(s);
};
