import ExcelJS from 'exceljs';
import { logger } from '../conf/logger/logger.js';
import { safeQuery } from '../database/db.js';
import { createBasicWorkbook, streamWorkbook, EXCEL_MIME_TYPE } from '../utils/excel.js';
import { writeAuditLog } from '../audit/auditLogger.js';
import { streamOdsFile, ODS_MIME_TYPE } from '../utils/ods.js';

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

    writeAuditLog({
      actionType: 'ELECTION_RESULTS_EXPORTED',
      level: 'INFO',
      actorId: req.user.username,
      actorRole: req.user.role,
      details: { electionId: electionId, type: 'total_results' },
    }).catch((e) => logger.error(e));

    await streamWorkbook(workbook, res, `election-anonymized-ballots-${electionId}.xlsx`);
  } catch (err) {
    logger.error('Error exporting ballots:', err);
    next(err);
  }
};

/**
 * Route handler that exports a pivot table: rows = ballots, columns = candidates.
 * Supports ?format=ods (default) or ?format=xlsx.
 */
export const exportBallotMatrixRoute = async (req, res, next) => {
  const { electionId } = req.params;
  if (!electionId) {
    return res.status(400).json({ message: 'electionId is required' });
  }

  const format = (req.query.format || 'ods').toLowerCase();

  try {
    // 1. Election info
    const electionRes = await safeQuery(
      `SELECT info FROM elections WHERE id = $1`,
      [electionId],
    );
    if (!electionRes.rows.length) {
      return res.status(404).json({ message: 'Election not found.' });
    }
    const electionName = electionRes.rows[0].info;

    // 2. Candidates sorted by listnum
    const candidatesRes = await safeQuery(
      `SELECT ec.listnum,
              COALESCE(c.firstname || ' ' || c.lastname, 'Liste ' || ec.listnum) AS name
       FROM electioncandidates ec
       LEFT JOIN candidates c ON c.id = ec.candidateid
       WHERE ec.electionid = $1
       ORDER BY ec.listnum ASC`,
      [electionId],
    );
    const candidates = candidatesRes.rows; // [{listnum, name}]

    if (!candidates.length) {
      return res.status(404).json({ message: 'No candidates found.' });
    }

    // 3. All ballots sorted by serial_id
    const ballotsRes = await safeQuery(
      `SELECT id, serial_id, valid FROM ballots WHERE election = $1 ORDER BY serial_id ASC`,
      [electionId],
    );
    if (!ballotsRes.rows.length) {
      return res.status(404).json({ message: 'No ballots found.' });
    }
    const ballots = ballotsRes.rows;

    // 4. All votes for this election
    const votesRes = await safeQuery(
      `SELECT bv.ballot, bv.listnum, bv.votes
       FROM ballotvotes bv
       WHERE bv.election = $1`,
      [electionId],
    );

    // Index votes by ballot id → listnum → votes
    const voteIndex = new Map();
    for (const row of votesRes.rows) {
      if (!voteIndex.has(row.ballot)) voteIndex.set(row.ballot, new Map());
      voteIndex.get(row.ballot).set(row.listnum, Number(row.votes));
    }

    // 5. Build header and data rows
    const candidateHeaders = candidates.map((c) => `${c.listnum}: ${c.name}`);
    const headers = ['Stimmzettel-Nr.', 'Gültig', ...candidateHeaders];

    const dataRows = ballots.map((b) => {
      const ballotVotes = voteIndex.get(b.id) || new Map();
      const voteCols = candidates.map((c) => ballotVotes.get(c.listnum) ?? 0);
      return [b.serial_id, b.valid ? 'Ja' : 'Nein', ...voteCols];
    });

    writeAuditLog({
      actionType: 'ELECTION_RESULTS_EXPORTED',
      level: 'INFO',
      actorId: req.user?.username || 'system',
      actorRole: req.user?.role || 'admin',
      details: { electionId, type: 'ballot_matrix', format },
    }).catch((e) => logger.error(e));

    const safeName = electionName.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_').substring(0, 40);
    const timestamp = new Date().toISOString().split('T')[0];

    if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Stimmzettel');

      // Header row with bold formatting
      const headerRow = sheet.addRow(headers);
      headerRow.font = { bold: true };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };

      // Data rows — numeric columns stay as numbers
      for (const row of dataRows) {
        sheet.addRow(row);
      }

      // Auto-width for first two columns
      sheet.getColumn(1).width = 18;
      sheet.getColumn(2).width = 10;
      for (let i = 3; i <= headers.length; i++) {
        sheet.getColumn(i).width = Math.max(12, candidateHeaders[i - 3].length * 0.85);
      }

      const filename = `Stimmzettel_${safeName}_${timestamp}.xlsx`;
      res.setHeader('Content-Type', EXCEL_MIME_TYPE);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      await workbook.xlsx.write(res);
      res.end();
    } else {
      // ODS — numeric values as strings (compatible with Calc/Excel)
      const odsRows = dataRows.map((row) => row.map(String));
      const filename = `Stimmzettel_${safeName}_${timestamp}.ods`;
      await streamOdsFile(
        [{ name: 'Stimmzettel', headers, rows: odsRows }],
        res,
        filename,
      );
    }
  } catch (err) {
    logger.error('Error exporting ballot matrix:', err);
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

    writeAuditLog({
      actionType: 'ELECTION_RESULTS_EXPORTED',
      level: 'INFO',
      actorId: req.user.username,
      actorRole: req.user.role,
    }).catch((e) => logger.error(e));

    await streamWorkbook(workbook, res, `election-definition-${endDate}.xlsx`);
  } catch (err) {
    logger.error('Error exporting election definition:', err);
    next(err);
  }
};
