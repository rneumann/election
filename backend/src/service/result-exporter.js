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
          ? ['List #', 'Candidate', 'Votes', 'Seats', 'Percentage']
          : ['List #', 'Candidate', 'Votes', 'Status', 'Percentage'];

    headers.forEach((header, index) => {
      const cell = worksheet.getCell(headerRow, index + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    currentRow++;

    // Results data rows - support both 'allocation' and 'all_candidates' fields
    let candidatesData = [];

    // Special handling for referendums
    if (result.election_type === 'referendum' && resultData.yes_votes !== undefined) {
      // Build candidates array from referendum vote data
      candidatesData = [
        {
          listnum: 1,
          option: 'Yes',
          votes: resultData.yes_votes,
          percentage: resultData.yes_percentage,
          status: resultData.result === 'ACCEPTED' ? 'Accepted' : '-',
        },
        {
          listnum: 2,
          option: 'No',
          votes: resultData.no_votes,
          percentage: resultData.no_percentage,
          status: resultData.result === 'REJECTED' ? 'Rejected' : '-',
        },
      ];
      if (resultData.abstain_votes > 0) {
        candidatesData.push({
          listnum: 3,
          option: 'Abstain',
          votes: resultData.abstain_votes,
          percentage: resultData.abstain_percentage,
          status: '-',
        });
      }
    } else {
      candidatesData =
        resultData.allocation || resultData.all_candidates || resultData.elected || [];
    }

    if (Array.isArray(candidatesData) && candidatesData.length > 0) {
      candidatesData.forEach((candidate) => {
        const row = worksheet.getRow(currentRow);

        if (result.election_type === 'referendum') {
          // Referendum format
          const optionName =
            candidate.option ||
            (candidate.listnum === 1 ? 'Yes' : candidate.listnum === 2 ? 'No' : 'Abstain');
          row.getCell(COL_A).value = optionName;
          row.getCell(COL_B).value = candidate.votes;
          row.getCell(COL_C).value = candidate.percentage ? `${candidate.percentage}%` : '-';
          row.getCell(COL_D).value = candidate.status || '-';
        } else if (result.election_type === 'proportional_representation') {
          // Proportional representation format
          row.getCell(COL_A).value = candidate.listnum;
          row.getCell(COL_B).value = `${candidate.firstname} ${candidate.lastname}`;
          row.getCell(COL_C).value = candidate.votes;
          row.getCell(COL_D).value = candidate.seats || 0;
          row.getCell(COL_E).value = candidate.percentage ? `${candidate.percentage}%` : '-';

          // Highlight elected candidates (seats > 0)
          if (candidate.seats > 0) {
            row.eachCell((cell) => {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD4EDDA' },
              };
            });
          }
        } else {
          // Majority vote format
          row.getCell(COL_A).value = candidate.listnum;
          row.getCell(COL_B).value = `${candidate.firstname} ${candidate.lastname}`;
          row.getCell(COL_C).value = candidate.votes;
          row.getCell(COL_D).value = candidate.is_elected
            ? 'Elected'
            : candidate.is_tie
              ? 'Tie'
              : 'Not Elected';
          row.getCell(COL_E).value = candidate.percentage ? `${candidate.percentage}%` : '-';

          // Highlight elected candidates
          if (candidate.is_elected) {
            row.eachCell((cell) => {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD4EDDA' },
              };
            });
          }

          // Highlight ties
          if (candidate.is_tie) {
            row.eachCell((cell) => {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFF4E6' },
              };
            });
          }
        }

        // Apply borders to all cells
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
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
  return new Date(date).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
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
  return new Date(date).toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};
