import ExcelJS from 'exceljs';
import { logger } from '../conf/logger/logger.js';
import { client } from '../database/db.js';

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

      const listvotes = listVote ? 1 : 0;
      const votesPerBallot = seats;
      const maxCumulativeVotes = Number(maxKum) || 0;

      const insertElectionQuery = `
        INSERT INTO elections (
          info,
          description,
          listvotes,
          votes_per_ballot,
          max_cumulative_votes,
          start,
          "end"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
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
