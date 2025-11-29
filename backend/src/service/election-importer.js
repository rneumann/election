import ExcelJS from 'exceljs';
import { logger } from '../conf/logger/logger.js';
import { client } from '../database/db.js';

/**
 * Mapping tables for election configuration.
 * These mappings convert German text values from Excel dropdowns to database values.
 */
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
 *
 * The Excel file is expected to have the following structure:
 * - D3: Global start date (required)
 * - D4: Global end date (required)
 *   A: Identifier
 *   B: Election info/description
 *   C: List vote flag ('1' for true)
 *   D: Seats per ballot
 *   E: Maximum cumulative votes
 *   F: Faculties (comma-separated)
 *   G: Courses / voter groups (comma-separated)
 *   H: Election type (text from dropdown - see ELECTION_TYPE_MAPPING)
 *   I: Counting method (text from dropdown - see COUNTING_METHOD_MAPPING)
 *
 * Election Type Values (Column H):
 *   - Mehrheitswahl
 *   - Verhältniswahl
 *   - Urabstimmung
 *
 * Counting Method Values (Column I):
 *   - Sainte-Laguë
 *   - Hare-Niemeyer
 *   - Einfache Mehrheit
 *   - Absolute Mehrheit
 *   - Ja/Nein/Enthaltung
 *
 * @async
 * @param {string} filePath - Path to the Excel file to import
 * @throws Will throw an error if the file cannot be read, required cells are missing,
 *         or a database operation fails
 */
export const importElectionData = async (filePath) => {
  const db = await client.connect();

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new Error('This workbook has no worksheets.');
    }

    const startDateStr = sheet.getCell('D3').value;
    const endDateStr = sheet.getCell('D4').value;

    if (!startDateStr || !endDateStr) {
      throw new Error('Start or end date missing expected in D3 and D4.');
    }

    const startDate = parseDate(startDateStr);
    const endDate = parseDate(endDateStr);

    logger.info(`Importing elections for period ${startDate} → ${endDate}`);

    await db.query('BEGIN');

    let rowIndex = 8;

    while (sheet.getCell(`A${rowIndex}`).value) {
      const identifier = sheet.getCell(`A${rowIndex}`).value;
      const info = sheet.getCell(`B${rowIndex}`).value;
      const listVote = sheet.getCell(`C${rowIndex}`).value == '1';
      const seatsValue = sheet.getCell(`D${rowIndex}`).value || 1;
      const maxKum = sheet.getCell(`E${rowIndex}`).value ?? 0;
      const facultyStr = sheet.getCell(`F${rowIndex}`).value;
      const coursesStr = sheet.getCell(`G${rowIndex}`).value;
      const electionTypeText = sheet.getCell(`H${rowIndex}`).value?.toString().trim();
      const countingMethodText = sheet.getCell(`I${rowIndex}`).value?.toString().trim();

      const listvotes = listVote ? 1 : 0;
      const seatsToFill = Number(seatsValue);
      const votesPerBallot = Number(seatsValue); // Column D: seats/votes per ballot
      const maxCumulativeVotes = Number(maxKum) || 0;

      // Validate seats_to_fill
      if (!Number.isInteger(seatsToFill) || seatsToFill < 1) {
        throw new Error(
          `Invalid seats_to_fill in row ${rowIndex}: must be a positive integer, got ${seatsValue}`,
        );
      }

      // Validate votes_per_ballot
      if (!Number.isInteger(votesPerBallot) || votesPerBallot < 1) {
        throw new Error(
          `Invalid votes_per_ballot in row ${rowIndex}: must be a positive integer, got ${seatsValue}`,
        );
      }

      // Validate and map election type
      if (!electionTypeText) {
        throw new Error(
          `Missing election_type (column H) in row ${rowIndex}. Expected: Mehrheitswahl, Verhältniswahl, or Urabstimmung.`,
        );
      }

      const electionType = ELECTION_TYPE_MAPPING.get(electionTypeText);
      if (!electionType) {
        const validTypes = [...ELECTION_TYPE_MAPPING.keys()].join(', ');
        throw new Error(
          `Invalid election_type '${electionTypeText}' in row ${rowIndex}. Valid values: ${validTypes}`,
        );
      }

      // Validate and map counting method
      if (!countingMethodText) {
        throw new Error(
          `Missing counting_method (column I) in row ${rowIndex}. Expected: Sainte-Laguë, Hare-Niemeyer, Einfache Mehrheit, Absolute Mehrheit, or Ja/Nein/Enthaltung.`,
        );
      }

      const countingMethod = COUNTING_METHOD_MAPPING.get(countingMethodText);
      if (!countingMethod) {
        const validMethods = [...COUNTING_METHOD_MAPPING.keys()].join(', ');
        throw new Error(
          `Invalid counting_method '${countingMethodText}' in row ${rowIndex}. Valid values: ${validMethods}`,
        );
      }

      logger.info(
        `Row ${rowIndex}: ${info} → election_type=${electionType}, counting_method=${countingMethod}`,
      );

      const insertElectionQuery = `
        INSERT INTO elections (
          info,
          description,
          listvotes,
          seats_to_fill,
          votes_per_ballot,
          max_cumulative_votes,
          start,
          "end",
          election_type,
          counting_method
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id;
      `;

      const { rows } = await db.query(insertElectionQuery, [
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

      const electionId = rows[0].id;

      // Insert faculties as voter groups
      if (facultyStr) {
        const faculties = String(facultyStr)
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean);

        for (const fac of faculties) {
          await db.query(
            `INSERT INTO votergroups (electionId, votergroup, faculty)
             VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
            [electionId, fac, fac],
          );
        }
      }

      // Insert courses as voter groups
      if (coursesStr) {
        const courses = String(coursesStr)
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean);

        for (const course of courses) {
          await db.query(
            `INSERT INTO votergroups (electionId, votergroup, faculty)
             VALUES ($1, $2, NULL) ON CONFLICT DO NOTHING`,
            [electionId, course],
          );
        }
      }

      // Default voter group if none provided
      if (!facultyStr && !coursesStr) {
        await db.query(
          `INSERT INTO votergroups (electionId, votergroup, faculty)
           VALUES ($1, 'ALL', NULL) ON CONFLICT DO NOTHING`,
          [electionId],
        );
      }

      rowIndex++;
    }

    await db.query('COMMIT');
    logger.info('Election import completed.');
  } catch (err) {
    await db.query('ROLLBACK');
    logger.error('Error during Excel import:', err);
    throw err;
  } finally {
    db.release();
  }
};

/**
 * Parses a date from various string or Date formats.
 * Supports Excel-style DD.MM.YYYY strings or standard ISO date strings.
 *
 * @param {string|Date} value - Value to parse as a date
 * @returns {Date} Parsed JavaScript Date object
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
