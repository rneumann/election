import ExcelJS from 'exceljs';
import { logger } from '../conf/logger/logger.js';
import { client } from '../database/db.js';

// Column indices for Excel cells
const COL_A = 1;
const COL_B = 2;
const COL_C = 3;
const COL_D = 4;
const COL_E = 5;

// Constants
const PERCENT_MULTIPLIER = 100;

/**
 * Generates an Excel file for election result export
 *
 * Creates a professional Excel workbook containing:
 * - Election metadata (name, type, counting method)
 * - Ballot statistics (total ballots, valid, invalid)
 * - Detailed results with candidates, votes, seats, percentages
 *
 * @async
 * @param {string} resultId - UUID of the election result to export
 * @returns {Promise<Buffer>} Excel file as buffer
 * @throws {Error} If result not found or database error occurs
 */
export const generateElectionResultExcel = async (resultId) => {
  const db = await client.connect();

  try {
    logger.info(`Generating Excel export for result ${resultId}`);

    // Fetch result data with election metadata and ballot statistics
    const resultQuery = `
      SELECT 
        er.id,
        er.version,
        er.is_final,
        er.result_data,
        er.counted_at,
        er.counted_by,
        er.test_election,
        e.id as election_id,
        e.info as election_name,
        e.description,
        e.election_type,
        e.counting_method,
        e.seats_to_fill,
        e.votes_per_ballot,
        e.start as election_start,
        e."end" as election_end,
        COUNT(b.id) as total_ballots,
        COUNT(b.id) FILTER (WHERE b.valid = TRUE) as valid_ballots,
        COUNT(b.id) FILTER (WHERE b.valid = FALSE) as invalid_ballots
      FROM election_results er
      JOIN elections e ON er.election_id = e.id
      LEFT JOIN ballots b ON b.election = e.id
      WHERE er.id = $1
      GROUP BY er.id, er.version, er.is_final, er.result_data, er.counted_at, er.counted_by,
               e.id, e.info, e.description, e.election_type, e.counting_method, 
               e.seats_to_fill, e.votes_per_ballot, e.start, e."end"
    `;

    const resultRes = await db.query(resultQuery, [resultId]);

    if (resultRes.rows.length === 0) {
      throw new Error(`Election result with ID ${resultId} not found`);
    }

    const result = resultRes.rows[0];
    const resultData = result.result_data;

    // For referendums: Load option names from candidates keyword field
    // The keyword contains the full text
    let optionNamesMap = {};
    if (result.election_type === 'referendum') {
      const optionsQuery = `
        SELECT ec.listnum, ec.keyword
        FROM electioncandidates ec
        WHERE ec.electionid = $1
        ORDER BY ec.listnum
      `;
      const optionsRes = await db.query(optionsQuery, [result.election_id]);
      optionsRes.rows.forEach((row) => {
        optionNamesMap[row.listnum] = row.keyword;
      });
      logger.debug(`Loaded ${optionsRes.rows.length} option keywords for referendum`);
    }

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'HKA Election System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Election Result');

    // Set column widths
    worksheet.columns = [{ width: 25 }, { width: 20 }, { width: 15 }, { width: 15 }, { width: 15 }];

    let currentRow = 1;

    // Section 1: Election Information
    worksheet.getCell(`A${currentRow}`).value = 'Election Information';
    worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 14 };
    currentRow += 2;

    const electionInfo = [
      ['Election Name:', result.election_name],
      ['Description:', result.description || '-'],
      ['Test Election:', result.test_election ? 'Yes' : 'No'],
      ['Election Type:', formatElectionType(result.election_type)],
      ['Counting Method:', formatCountingMethod(result.counting_method)],
      ['Seats to Fill:', result.seats_to_fill],
      [
        'Election Period:',
        `${formatDate(result.election_start)} - ${formatDate(result.election_end)}`,
      ],
      ['Counted At:', formatDateTime(result.counted_at)],
      ['Counted By:', result.counted_by || 'System'],
      ['Version:', result.version],
      ['Status:', result.is_final ? 'Final' : 'Draft'],
    ];

    electionInfo.forEach(([label, value]) => {
      worksheet.getCell(`A${currentRow}`).value = label;
      worksheet.getCell(`A${currentRow}`).font = { bold: true };
      worksheet.getCell(`B${currentRow}`).value = value;
      currentRow++;
    });

    currentRow += 2;

    // Section 2: Ballot Statistics
    worksheet.getCell(`A${currentRow}`).value = 'Ballot Statistics';
    worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 14 };
    currentRow += 2;

    const ballotStats = [
      ['Total Ballots:', result.total_ballots],
      ['Valid Ballots:', result.valid_ballots],
      ['Invalid Ballots:', result.invalid_ballots],
      [
        'Validity Rate:',
        result.total_ballots > 0
          ? `${((result.valid_ballots / result.total_ballots) * PERCENT_MULTIPLIER).toFixed(2)}%`
          : '0%',
      ],
    ];

    ballotStats.forEach(([label, value]) => {
      worksheet.getCell(`A${currentRow}`).value = label;
      worksheet.getCell(`A${currentRow}`).font = { bold: true };
      worksheet.getCell(`B${currentRow}`).value = value;
      currentRow++;
    });

    currentRow += 2;

    // Section 3: Detailed Results
    worksheet.getCell(`A${currentRow}`).value = 'Election Results';
    worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 14 };
    currentRow += 2;

    // Algorithm-specific information
    if (resultData.algorithm) {
      worksheet.getCell(`A${currentRow}`).value = 'Algorithm:';
      worksheet.getCell(`A${currentRow}`).font = { bold: true };
      worksheet.getCell(`B${currentRow}`).value = resultData.algorithm;
      currentRow++;
    }

    if (resultData.total_votes !== undefined) {
      worksheet.getCell(`A${currentRow}`).value = 'Total Votes Cast:';
      worksheet.getCell(`A${currentRow}`).font = { bold: true };
      worksheet.getCell(`B${currentRow}`).value = resultData.total_votes;
      currentRow++;
    }

    // Tie detection warning
    if (resultData.ties_detected) {
      currentRow++;
      worksheet.getCell(`A${currentRow}`).value = '⚠️ TIE DETECTED';
      worksheet.getCell(`A${currentRow}`).font = { bold: true, color: { argb: 'FFFF6B00' } };
      worksheet.getCell(`A${currentRow}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFF4E6' },
      };
      currentRow++;
      worksheet.getCell(`A${currentRow}`).value =
        resultData.tie_info || 'Manual resolution required';
      worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
      currentRow += 2;
    }

    currentRow++;

    // Results table header
    const headerRow = currentRow;
    const headers =
      result.election_type === 'referendum'
        ? ['Option', 'Votes', 'Percentage', 'Status']
        : result.election_type === 'proportional_representation'
          ? ['Liste / Kandidat', 'Stimmen', 'Sitze', 'Quote', 'Status']
          : ['List #', 'Candidate', 'Votes', 'Status', 'Percentage'];

    headers.forEach((header, index) => {
      const cell = worksheet.getCell(headerRow, index + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' },
      };
    });

    currentRow++;

    // ── Proportional representation: list summary + per-candidate detail ──
    if (result.election_type === 'proportional_representation') {
      const allocation = resultData.allocation || [];

      allocation.forEach((listEntry) => {
        const listName = listEntry.firstname?.trim() || `Liste ${listEntry.listnum}`;
        const hasSeats = (listEntry.seats || 0) > 0;

        // List header row
        const listRow = worksheet.getRow(currentRow);
        listRow.getCell(COL_A).value = listName;
        listRow.getCell(COL_A).font = { bold: true };
        listRow.getCell(COL_B).value = listEntry.votes;
        listRow.getCell(COL_B).font = { bold: true };
        listRow.getCell(COL_C).value = listEntry.seats ?? 0;
        listRow.getCell(COL_C).font = { bold: true };
        listRow.getCell(COL_D).value = listEntry.quota ? `${listEntry.quota}` : '-';
        listRow.getCell(COL_E).value = listEntry.is_tie ? '⚠ Gleichstand' : hasSeats ? '✓ Sitze erhalten' : 'Kein Sitz';

        const listFill = listEntry.is_tie
          ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF4E6' } }
          : hasSeats
            ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } }
            : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };

        listRow.eachCell((cell) => {
          cell.fill = listFill;
          cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' },
          };
        });
        currentRow++;

        // Individual candidate rows within the list
        const candidates = listEntry.list_candidates || [];
        candidates.forEach((c) => {
          const candRow = worksheet.getRow(currentRow);
          candRow.getCell(COL_A).value = `    ${c.firstname} ${c.lastname}`;
          candRow.getCell(COL_B).value = c.votes;
          candRow.getCell(COL_C).value = '';
          candRow.getCell(COL_D).value = '';
          candRow.getCell(COL_E).value = c.is_elected ? '✓ Gewählt' : '';

          if (c.is_elected) {
            candRow.eachCell((cell) => {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
            });
          }
          candRow.eachCell((cell) => {
            cell.border = {
              top: { style: 'thin' }, left: { style: 'thin' },
              bottom: { style: 'thin' }, right: { style: 'thin' },
            };
          });
          currentRow++;
        });
      });

    // ── Referendum ──
    } else if (result.election_type === 'referendum') {
      let candidatesData = [];
      if (resultData.yes_votes !== undefined) {
        candidatesData = [
          { option: optionNamesMap[1] || 'Ja',         votes: resultData.yes_votes,      percentage: resultData.yes_percentage,          status: resultData.result === 'ACCEPTED' ? 'Angenommen' : '-' },
          { option: optionNamesMap[2] || 'Nein',        votes: resultData.no_votes,       percentage: resultData.no_percentage,           status: resultData.result === 'REJECTED' ? 'Abgelehnt' : '-' },
          { option: optionNamesMap[3] || 'Enthaltung',  votes: resultData.abstain_votes || 0, percentage: resultData.abstain_percentage || '0.00', status: '-' },
        ];
      } else if (resultData.all_candidates) {
        candidatesData = resultData.all_candidates.map((c, i) => ({
          option: optionNamesMap[c.listnum] || c.name || `Option ${c.listnum}`,
          votes: c.votes,
          percentage: c.percentage,
          status: i === 0 && !resultData.ties_detected ? 'Gewinner' : '-',
        }));
      }
      candidatesData.forEach((candidate) => {
        const row = worksheet.getRow(currentRow);
        row.getCell(COL_A).value = candidate.option;
        row.getCell(COL_B).value = candidate.votes;
        row.getCell(COL_C).value = candidate.percentage ? `${candidate.percentage}%` : '-';
        row.getCell(COL_D).value = candidate.status || '-';
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' },
          };
        });
        currentRow++;
      });

    // ── Majority vote ──
    } else {
      const candidatesData = resultData.allocation || resultData.all_candidates || resultData.elected || [];
      candidatesData.forEach((candidate) => {
        const row = worksheet.getRow(currentRow);
        row.getCell(COL_A).value = candidate.listnum;
        row.getCell(COL_B).value = `${candidate.firstname || ''} ${candidate.lastname || ''}`.trim();
        row.getCell(COL_C).value = candidate.votes;
        row.getCell(COL_D).value = candidate.is_elected ? 'Gewählt' : candidate.is_tie ? 'Gleichstand' : 'Nicht gewählt';
        row.getCell(COL_E).value = candidate.percentage ? `${candidate.percentage}%` : '-';

        if (candidate.is_elected) {
          row.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } };
          });
        } else if (candidate.is_tie) {
          row.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF4E6' } };
          });
        }
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' },
          };
        });
        currentRow++;
      });
    }

    // Additional information for specific algorithms
    if (resultData.referendum_result) {
      currentRow += 2;
      worksheet.getCell(`A${currentRow}`).value = 'Referendum Decision:';
      worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 12 };
      worksheet.getCell(`B${currentRow}`).value = resultData.referendum_result.decision;
      worksheet.getCell(`B${currentRow}`).font = {
        bold: true,
        size: 12,
        color: { argb: resultData.referendum_result.accepted ? 'FF28A745' : 'FFDC3545' },
      };
      currentRow++;

      if (resultData.referendum_result.quorum_reached !== undefined) {
        worksheet.getCell(`A${currentRow}`).value = 'Quorum Reached:';
        worksheet.getCell(`A${currentRow}`).font = { bold: true };
        worksheet.getCell(`B${currentRow}`).value = resultData.referendum_result.quorum_reached
          ? 'Yes'
          : 'No';
        currentRow++;
      }
    }

    logger.info(`Excel export generated successfully for result ${resultId}`);

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  } catch (err) {
    logger.error('Error generating Excel export:', err);
    throw err;
  } finally {
    db.release();
  }
};

/**
 * Helper function to format election type for display
 *
 * @param {string} type - Election type identifier
 * @returns {string} Formatted election type name
 */
const formatElectionType = (type) => {
  const typeMap = {
    majority_vote: 'Majority Vote',
    proportional_representation: 'Proportional Representation',
    referendum: 'Referendum',
  };
  // eslint-disable-next-line security/detect-object-injection
  return typeMap[type] || type;
};

/**
 * Helper function to format counting method for display
 *
 * @param {string} method - Counting method identifier
 * @returns {string} Formatted counting method name
 */
const formatCountingMethod = (method) => {
  const methodMap = {
    sainte_lague: 'Sainte-Laguë',
    hare_niemeyer: 'Hare-Niemeyer',
    highest_votes_simple: 'Simple Majority',
    highest_votes_absolute: 'Absolute Majority',
    yes_no_referendum: 'Yes/No/Abstain Referendum',
  };
  // eslint-disable-next-line security/detect-object-injection
  return methodMap[method] || method;
};

/**
 * Helper function to format date
 *
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
const formatDate = (date) => {
  if (!date) {
    return '-';
  }
  return new Date(date).toLocaleDateString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Europe/Berlin',
  });
};

/**
 * Helper function to format date and time
 *
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date and time string
 */
const formatDateTime = (date) => {
  if (!date) {
    return '-';
  }
  return new Date(date).toLocaleString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Berlin',
  });
};
