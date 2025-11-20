import ExcelJS from 'exceljs';
import { logger } from '../conf/logger/logger.js';
import { client } from '../database/db.js';

// --- MIME & Headers ---
const EXCEL_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const CONTENT_TYPE = 'Content-Type';
const CONTENT_DISPOSITION = 'Content-Disposition';

/**
 * Generates a Content-Disposition header value for file downloads.
 *
 * @param {string} filename - The name of the file to be downloaded
 * @returns {string} The properly formatted Content-Disposition header value
 */
const CONTENT_DISPOSITION_ATTACHMENT = (filename) => `attachment; filename="${filename}"`;

// --- Sheet Names ---
const SHEET_TOTAL_RESULTS = 'Total Results';
const SHEET_BALLOTS = 'Ballots';
const SHEET_SUMMARY = 'Summary';

// --- Summary Header ---
const SUMMARY_HEADER_ROW = 7;
const SUMMARY_HEADERS = [
  'Kennung',
  'Info',
  'Listen',
  'Plätze',
  'max. Kum.',
  'Fakultäten',
  'Studiengänge',
];

// --- Summary Start Row ---
const SUMMARY_START_ROW = 8;

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
  logger.debug('Export route for total results accessed');

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { electionId } = req.params;
  if (!electionId) {
    return res.status(400).json({ message: 'electionId is required' });
  }

  try {
    const query = `
      SELECT 
        c.firstname || ' ' || c.lastname AS candidate,
        SUM(bv.votes) AS votes
      FROM 
        candidates c
      JOIN 
        electioncandidates ec ON c.id = ec.candidateId
      JOIN
        ballotvotes bv ON ec.electionId = bv.election AND ec.listnum = bv.listnum
      WHERE 
        ec.electionId = $1
      GROUP BY 
        c.firstname, c.lastname
      ORDER BY 
        votes DESC;
    `;
    const dbResult = await client.query(query, [electionId]);

    if (dbResult.rows.length === 0) {
      return res.status(404).json({ message: 'No results found for this election ID.' });
    }
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(SHEET_TOTAL_RESULTS);
    const excelWritePromise = workbook.xlsx.write(res);

    sheet.addRow(['Candidate', 'Votes']);
    dbResult.rows.forEach((r) => sheet.addRow([r.candidate, r.votes]));

    const fileName = `election-total-results-${electionId}.xlsx`;
    res.setHeader(CONTENT_TYPE, EXCEL_MIME_TYPE);
    res.setHeader(CONTENT_DISPOSITION, CONTENT_DISPOSITION_ATTACHMENT(fileName));

    await excelWritePromise;
    res.end();
  } catch (error) {
    logger.error('Error exporting total results:', error);
    next(error);
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
  logger.debug('Export route for anonymized ballots accessed');

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { electionId } = req.params;
  if (!electionId) {
    return res.status(400).json({ message: 'electionId is required' });
  }

  try {
    const query = `
      SELECT 
        bv.ballot AS "ballotId",
        ec.candidateId AS "candidateId"
      FROM 
        ballotvotes bv
      JOIN
        electioncandidates ec ON bv.election = ec.electionId 
        AND bv.listnum = ec.listnum
      WHERE 
        bv.election = $1;
    `;
    const dbResult = await client.query(query, [electionId]);

    if (dbResult.rows.length === 0) {
      return res.status(404).json({ message: 'No ballots found for this election ID.' });
    }
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(SHEET_BALLOTS);
    const excelWritePromise = workbook.xlsx.write(res);

    sheet.addRow(['Ballot ID', 'Candidate ID']);
    dbResult.rows.forEach((r) => sheet.addRow([r.ballotId, r.candidateId]));

    const fileName = `election-anonymized-ballots-${electionId}.xlsx`;
    res.setHeader(CONTENT_TYPE, EXCEL_MIME_TYPE);
    res.setHeader(CONTENT_DISPOSITION, CONTENT_DISPOSITION_ATTACHMENT(fileName));

    await excelWritePromise;
    res.end();
  } catch (error) {
    logger.error('Error exporting ballots:', error);
    next(error);
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
  logger.debug('Export route for election definition accessed');

  let { startDate, endDate } = req.query;

  try {
    if (!startDate || !endDate) {
      logger.warn('No startDate/endDate passed, using most recent election interval.');

      const latest = await client.query(
        `SELECT DISTINCT start, "end"
         FROM elections
         ORDER BY start DESC
         LIMIT 1`,
      );

      if (!latest.rows.length) {
        return res.status(400).json({
          message: 'No elections found and no date range provided.',
        });
      }

      startDate = latest.rows[0].start;
      endDate = latest.rows[0].end;

      logger.info(`Using fallback interval: ${startDate} → ${endDate}`);
    }

    const electionsRes = await client.query(
      `SELECT * FROM elections
       WHERE start = $1 AND "end" = $2
       ORDER BY id`,
      [startDate, endDate],
    );

    const elections = electionsRes.rows;
    if (!elections.length) {
      return res.status(404).json({ message: 'No elections found for this period.' });
    }
    const workbook = new ExcelJS.Workbook();
    const summary = workbook.addWorksheet(SHEET_SUMMARY);
    const excelWritePromise = workbook.xlsx.write(res);

    summary.getCell('D3').value = startDate;
    summary.getCell('D4').value = endDate;
    summary.getRow(SUMMARY_HEADER_ROW).values = SUMMARY_HEADERS;

    let summaryRow = SUMMARY_START_ROW;

    for (const election of elections) {
      const vgRes = await client.query(
        `SELECT v.votergroup, v.faculty
         FROM votergroups v
         WHERE v.electionId = $1`,
        [election.id],
      );

      const faculties = new Set();
      const courses = new Set();
      vgRes.rows.forEach((vg) => {
        if (vg.faculty) {
          faculties.add(vg.faculty);
        }
        if (vg.votergroup) {
          courses.add(vg.votergroup);
        }
      });

      summary.getRow(summaryRow++).values = [
        election.id,
        election.info,
        election.listvotes,
        election.votes_per_ballot,
        election.max_cumulative_votes || null,
        [...faculties].join(', '),
        [...courses].join(', '),
      ];
    }

    const fileName = `election-definition-${startDate}_${endDate}.xlsx`;
    res.setHeader(CONTENT_TYPE, EXCEL_MIME_TYPE);
    res.setHeader(CONTENT_DISPOSITION, CONTENT_DISPOSITION_ATTACHMENT(fileName));

    await excelWritePromise;
    res.end();
  } catch (err) {
    logger.error('Error exporting election definition:', err);
    next(err);
  }
};
