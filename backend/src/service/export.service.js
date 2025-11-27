import ExcelJS from 'exceljs';
import { logger } from '../conf/logger/logger.js';
import { safeQuery } from '../database/db.js';
import { createBasicWorkbook, streamWorkbook } from '../utils/excel.js';

// Sheet Names
const SHEET_TOTAL_RESULTS = 'Total Results';
const SHEET_BALLOTS = 'Ballots';
const SHEET_SUMMARY = 'Summary';

/**
 * Route handler for exporting aggregated election results.
 *
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} Sends an Excel file as response
 */
export const exportTotalResultsRoute = async (req, res, next) => {
  logger.debug('Accessed total results export route');

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { electionId } = req.params;
  if (!electionId) {
    return res.status(400).json({ message: 'electionId is required' });
  }

  try {
    const result = await safeQuery(
      `
      SELECT 
        c.firstname || ' ' || c.lastname AS candidate,
        SUM(bv.votes) AS votes
      FROM candidates c
      JOIN electioncandidates ec ON c.id = ec.candidateId
      JOIN ballotvotes bv ON ec.electionId = bv.election AND ec.listnum = bv.listnum
      WHERE ec.electionId = $1
      GROUP BY c.firstname, c.lastname
      ORDER BY votes DESC;
    `,
      [electionId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No results found.' });
    }

    const rows = result.rows.map((r) => [r.candidate, r.votes]);

    const workbook = createBasicWorkbook(SHEET_TOTAL_RESULTS, ['Candidate', 'Votes'], rows);

    await streamWorkbook(workbook, res, `election-total-results-${electionId}.xlsx`);
  } catch (err) {
    logger.error('Error exporting election results:', err);
    next(err);
  }
};

/**
 * Route handler for exporting anonymized ballot data.
 *
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} Sends an Excel file as response
 */
export const exportBallotsRoute = async (req, res, next) => {
  logger.debug('Accessed ballots export route');

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { electionId } = req.params;
  if (!electionId) {
    return res.status(400).json({ message: 'electionId is required' });
  }

  try {
    const result = await safeQuery(
      `
      SELECT 
        bv.ballot AS "ballotId",
        ec.candidateId AS "candidateId"
      FROM ballotvotes bv
      JOIN electioncandidates ec ON bv.election = ec.electionId AND bv.listnum = ec.listnum
      WHERE bv.election = $1;
    `,
      [electionId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No ballots found.' });
    }

    const rows = result.rows.map((r) => [r.ballotId, r.candidateId]);

    const workbook = createBasicWorkbook(SHEET_BALLOTS, ['Ballot ID', 'Candidate ID'], rows);

    await streamWorkbook(workbook, res, `election-anonymized-ballots-${electionId}.xlsx`);
  } catch (err) {
    logger.error('Error exporting ballots:', err);
    next(err);
  }
};

/**
 * Route handler for exporting the election definition.
 *
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} Sends an Excel file as response
 */
export const exportElectionDefinitionRoute = async (req, res, next) => {
  logger.debug('Accessed election definition export route');

  let { startDate, endDate } = req.query;

  try {
    if (!startDate || !endDate) {
      logger.warn('No dates provided – loading most recent election interval');

      const fallback = await safeQuery(
        `SELECT DISTINCT start, "end" FROM elections ORDER BY start DESC LIMIT 1`,
      );

      if (!fallback.rows.length) {
        return res.status(400).json({ message: 'No elections found' });
      }

      startDate = fallback.rows[0].start;
      endDate = fallback.rows[0].end;

      logger.info(`Using latest interval ${startDate} → ${endDate}`);
    }

    const electionRes = await safeQuery(
      `
      SELECT * FROM elections
      WHERE start = $1 AND "end" = $2
      ORDER BY id;
    `,
      [startDate, endDate],
    );

    const elections = electionRes.rows;
    if (!elections.length) {
      return res.status(404).json({ message: 'No elections in interval.' });
    }

    // Workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(SHEET_SUMMARY);

    sheet.getCell('D3').value = startDate;
    sheet.getCell('D4').value = endDate;

    sheet.addRow([]);
    sheet.addRow([]);
    sheet.addRow([
      'Kennung',
      'Info',
      'Listen',
      'Plätze',
      'max. Kum.',
      'Fakultäten',
      'Studiengänge',
    ]);

    for (const election of elections) {
      const vgRes = await safeQuery(
        `SELECT DISTINCT c.faculty, c.mtknr AS studiengang
         FROM electioncandidates ec
         JOIN candidates c ON c.id = ec.candidateId
         WHERE ec.electionId = $1`,
        [election.id],
      );

      const faculties = new Set();
      const courses = new Set();

      vgRes.rows.forEach((row) => {
        if (row.faculty) {
          faculties.add(row.faculty);
        }
        if (row.studiengang) {
          courses.add(row.studiengang);
        }
      });

      sheet.addRow([
        election.id,
        election.info,
        election.listvotes,
        election.votes_per_ballot,
        election.max_cumulative_votes ?? null,
        ' ',
        ' ',
      ]);
    }

    await streamWorkbook(workbook, res, `election-definition-${endDate}.xlsx`);
  } catch (err) {
    logger.error('Error exporting election definition:', err);
    next(err);
  }
};
