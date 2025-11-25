import ExcelJS from 'exceljs';
import { logger } from '../conf/logger/logger.js';
import { client } from '../database/db.js';

/**
 * Mapping tables for election configuration.
 * These mappings convert numeric codes from Excel to database values.
 */
const ELECTION_TYPE_MAPPING = {
  1: 'majority_vote',
  2: 'proportional_representation',
  3: 'referendum',
};

const COUNTING_METHOD_MAPPING = {
  1: 'sainte_lague',
  2: 'hare_niemeyer',
  3: 'highest_votes',
  4: 'yes_no_referendum',
};

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
 *   H: Election type (numeric code - see ELECTION_TYPE_MAPPING)
 *   I: Counting method (numeric code - see COUNTING_METHOD_MAPPING)
 *
 * Election Type Codes (Column H):
 *   1 = majority_vote
 *   2 = proportional_representation
 *   3 = referendum
 *
 * Counting Method Codes (Column I):
 *   1 = sainte_lague
 *   2 = hare_niemeyer
 *   3 = highest_votes
 *   4 = yes_no_referendum
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
      const seats = sheet.getCell(`D${rowIndex}`).value || 1;
      const maxKum = sheet.getCell(`E${rowIndex}`).value ?? 0;
      const facultyStr = sheet.getCell(`F${rowIndex}`).value;
      const coursesStr = sheet.getCell(`G${rowIndex}`).value;
      const electionTypeCode = sheet.getCell(`H${rowIndex}`).value;
      const countingMethodCode = sheet.getCell(`I${rowIndex}`).value;

      const listvotes = listVote ? 1 : 0;
      const votesPerBallot = seats;
      const maxCumulativeVotes = Number(maxKum) || 0;

      // Validate and map election type
      if (electionTypeCode == null || electionTypeCode === '') {
        throw new Error(
          `Missing election_type (column H) in row ${rowIndex}. Expected numeric code (1-3).`,
        );
      }

      const electionType = ELECTION_TYPE_MAPPING[Number(electionTypeCode)];
      if (!electionType) {
        throw new Error(
          `Invalid election_type code '${electionTypeCode}' in row ${rowIndex}. Valid codes: 1=majority_vote, 2=proportional_representation, 3=referendum`,
        );
      }

      // Validate and map counting method
      if (countingMethodCode == null || countingMethodCode === '') {
        throw new Error(
          `Missing counting_method (column I) in row ${rowIndex}. Expected numeric code (1-4).`,
        );
      }

      const countingMethod = COUNTING_METHOD_MAPPING[Number(countingMethodCode)];
      if (!countingMethod) {
        throw new Error(
          `Invalid counting_method code '${countingMethodCode}' in row ${rowIndex}. Valid codes: 1=sainte_lague, 2=hare_niemeyer, 3=highest_votes, 4=yes_no_referendum`,
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
          votes_per_ballot,
          max_cumulative_votes,
          start,
          "end",
          election_type,
          counting_method
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id;
      `;

      const { rows } = await db.query(insertElectionQuery, [
        info,
        identifier,
        listvotes,
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
