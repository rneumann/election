import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ExcelJS from 'exceljs';
import { generateElectionResultExcel } from '../src/service/result-exporter.js';
import { client } from '../src/database/db.js';
import { logger } from '../src/conf/logger/logger.js';

// Mock dependencies
vi.mock('../src/database/db.js');
vi.mock('../src/conf/logger/logger.js');

describe('generateElectionResultExcel', () => {
  let mockDb;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock database client
    mockDb = {
      query: vi.fn(),
      release: vi.fn(),
    };
    client.connect = vi.fn().mockResolvedValue(mockDb);

    // Mock logger
    logger.info = vi.fn();
    logger.error = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Majority Vote Elections', () => {
    it('should generate Excel for majority vote election with all candidates', async () => {
      const mockResultId = '123e4567-e89b-12d3-a456-426614174000';
      const mockResultData = {
        rows: [
          {
            id: mockResultId,
            version: 1,
            is_final: false,
            counted_at: '2025-11-29T10:00:00Z',
            counted_by: 'admin',
            election_id: '234e4567-e89b-12d3-a456-426614174000',
            election_name: 'Student Council Election',
            description: 'Annual student council election',
            election_type: 'majority_vote',
            counting_method: 'highest_votes_absolute',
            seats_to_fill: 3,
            votes_per_ballot: 3,
            election_start: '2025-11-01T00:00:00Z',
            election_end: '2025-11-10T23:59:59Z',
            total_ballots: 510,
            valid_ballots: 505,
            invalid_ballots: 5,
            validity_rate: 99.02,
            result_data: {
              all_candidates: [
                {
                  listnum: 1,
                  firstname: 'Max',
                  lastname: 'Müller',
                  votes: 180,
                  percentage: 35.29,
                  is_elected: true,
                  is_tie: false,
                },
                {
                  listnum: 2,
                  firstname: 'Anna',
                  lastname: 'Schmidt',
                  votes: 90,
                  percentage: 17.65,
                  is_elected: true,
                  is_tie: false,
                },
                {
                  listnum: 3,
                  firstname: 'Julia',
                  lastname: 'Weber',
                  votes: 70,
                  percentage: 13.73,
                  is_elected: true,
                  is_tie: false,
                },
                {
                  listnum: 4,
                  firstname: 'Lisa',
                  lastname: 'Wagner',
                  votes: 50,
                  percentage: 9.8,
                  is_elected: false,
                  is_tie: false,
                },
              ],
            },
          },
        ],
      };

      mockDb.query.mockResolvedValue(mockResultData);

      const buffer = await generateElectionResultExcel(mockResultId);

      // Verify buffer is valid
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);

      // Verify database calls
      expect(client.connect).toHaveBeenCalledTimes(1);
      expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'), [mockResultId]);
      expect(mockDb.release).toHaveBeenCalledTimes(1);

      // Verify logger calls
      expect(logger.info).toHaveBeenCalledWith(
        `Generating Excel export for result ${mockResultId}`,
      );
      expect(logger.info).toHaveBeenCalledWith(
        `Excel export generated successfully for result ${mockResultId}`,
      );

      // Parse Excel to verify content
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const worksheet = workbook.getWorksheet('Election Result');
      expect(worksheet).toBeDefined();

      // Check election information (search dynamically)
      let foundElectionInfo = false;
      let foundElectionName = false;
      let foundDescription = false;
      worksheet.eachRow((row, rowNumber) => {
        const label = row.getCell(1).value;
        const value = row.getCell(2).value;
        if (label === 'Election Information') {
          foundElectionInfo = true;
        }
        if (label === 'Election Name:' && value === 'Student Council Election') {
          foundElectionName = true;
        }
        if (label === 'Description:' && value === 'Annual student council election') {
          foundDescription = true;
        }
      });
      expect(foundElectionInfo).toBe(true);
      expect(foundElectionName).toBe(true);
      expect(foundDescription).toBe(true);

      // Check ballot statistics
      let foundBallotStats = false;
      let foundTotalBallots = false;
      let foundValidBallots = false;
      let foundInvalidBallots = false;
      worksheet.eachRow((row, rowNumber) => {
        const label = row.getCell(1).value;
        const value = row.getCell(2).value;
        if (label === 'Ballot Statistics') {
          foundBallotStats = true;
        }
        if (label === 'Total Ballots:' && value === 510) {
          foundTotalBallots = true;
        }
        if (label === 'Valid Ballots:' && value === 505) {
          foundValidBallots = true;
        }
        if (label === 'Invalid Ballots:' && value === 5) {
          foundInvalidBallots = true;
        }
      });
      expect(foundBallotStats).toBe(true);
      expect(foundTotalBallots).toBe(true);
      expect(foundValidBallots).toBe(true);
      expect(foundInvalidBallots).toBe(true);

      // Check results table header
      let foundResultsHeader = false;
      let foundTableHeader = false;
      worksheet.eachRow((row, rowNumber) => {
        const cellA = row.getCell(1).value;
        if (cellA === 'Election Results') {
          foundResultsHeader = true;
        }
        if (
          cellA === 'List #' &&
          row.getCell(2).value === 'Candidate' &&
          row.getCell(3).value === 'Votes' &&
          row.getCell(4).value === 'Status' &&
          row.getCell(5).value === 'Percentage'
        ) {
          foundTableHeader = true;
        }
      });
      expect(foundResultsHeader).toBe(true);
      expect(foundTableHeader).toBe(true);

      // Check first candidate data and highlighting
      let foundMaxMuller = false;
      let foundElectedHighlight = false;
      worksheet.eachRow((row, rowNumber) => {
        if (
          row.getCell(1).value === 1 &&
          row.getCell(2).value === 'Max Müller' &&
          row.getCell(3).value === 180 &&
          row.getCell(4).value === 'Elected' &&
          row.getCell(5).value === '35.29%'
        ) {
          foundMaxMuller = true;
          // Check green highlighting for elected candidate
          const cell = row.getCell(1);
          if (cell.fill && cell.fill.fgColor && cell.fill.fgColor.argb === 'FFD4EDDA') {
            foundElectedHighlight = true;
          }
        }
      });
      expect(foundMaxMuller).toBe(true);
      expect(foundElectedHighlight).toBe(true);
    });

    it('should handle majority vote with tie detection', async () => {
      const mockResultId = '456e4567-e89b-12d3-a456-426614174000';
      const mockResultData = {
        rows: [
          {
            id: mockResultId,
            version: 1,
            is_final: false,
            counted_at: '2025-11-29T10:00:00Z',
            counted_by: 'admin',
            election_id: '234e4567-e89b-12d3-a456-426614174000',
            election_name: 'Committee Election',
            description: 'Committee election with tie',
            election_type: 'majority_vote',
            counting_method: 'highest_votes_absolute',
            seats_to_fill: 2,
            votes_per_ballot: 2,
            election_start: '2025-11-01T00:00:00Z',
            election_end: '2025-11-10T23:59:59Z',
            total_ballots: 100,
            valid_ballots: 100,
            invalid_ballots: 0,
            validity_rate: 100.0,
            result_data: {
              all_candidates: [
                {
                  listnum: 1,
                  firstname: 'Anna',
                  lastname: 'Schmidt',
                  votes: 50,
                  percentage: 50.0,
                  is_elected: true,
                  is_tie: false,
                },
                {
                  listnum: 2,
                  firstname: 'Tom',
                  lastname: 'Fischer',
                  votes: 25,
                  percentage: 25.0,
                  is_elected: false,
                  is_tie: true,
                },
                {
                  listnum: 3,
                  firstname: 'Leon',
                  lastname: 'Hoffmann',
                  votes: 25,
                  percentage: 25.0,
                  is_elected: false,
                  is_tie: true,
                },
              ],
              ties_detected: true,
              tie_info:
                'Vote tie: 2 candidates with 25 votes, but only 1 seat(s) available. Affected candidates: Tom Fischer, Leon Hoffmann. Drawing lots required.',
            },
          },
        ],
      };

      mockDb.query.mockResolvedValue(mockResultData);

      const buffer = await generateElectionResultExcel(mockResultId);
      expect(buffer).toBeInstanceOf(Buffer);

      // Parse Excel to verify tie warning
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const worksheet = workbook.getWorksheet('Election Result');

      // Check for tie warning section
      let foundTieWarning = false;
      worksheet.eachRow((row, rowNumber) => {
        const cellValue = row.getCell(1).value;
        if (cellValue && cellValue.toString().includes('TIE DETECTED')) {
          foundTieWarning = true;
        }
      });

      expect(foundTieWarning).toBe(true);
    });
  });

  describe('Referendum Elections', () => {
    it('should generate Excel for referendum with yes/no/abstain votes', async () => {
      const mockResultId = '789e4567-e89b-12d3-a456-426614174000';
      const mockResultData = {
        rows: [
          {
            id: mockResultId,
            version: 3,
            is_final: false,
            counted_at: '2025-11-29T19:40:00Z',
            counted_by: 'admin',
            election_id: '890e4567-e89b-12d3-a456-426614174000',
            election_name: 'Budget Referendum',
            description: 'Vote on new budget proposal',
            election_type: 'referendum',
            counting_method: 'yes_no_referendum',
            seats_to_fill: 1,
            votes_per_ballot: 1,
            election_start: '2025-11-01T00:00:00Z',
            election_end: '2025-11-10T23:59:59Z',
            total_ballots: 10,
            valid_ballots: 10,
            invalid_ballots: 0,
            validity_rate: 100.0,
            result_data: {
              yes_votes: 6,
              no_votes: 4,
              abstain_votes: 0,
              yes_percentage: 60.0,
              no_percentage: 40.0,
              abstain_percentage: 0.0,
              result: 'ACCEPTED',
            },
          },
        ],
      };

      mockDb.query.mockResolvedValue(mockResultData);

      const buffer = await generateElectionResultExcel(mockResultId);
      expect(buffer).toBeInstanceOf(Buffer);

      // Parse Excel to verify referendum content
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const worksheet = workbook.getWorksheet('Election Result');

      // Check election type
      let foundReferendum = false;
      worksheet.eachRow((row, rowNumber) => {
        const label = row.getCell(1).value;
        const value = row.getCell(2).value;
        if (label === 'Election Type:' && value === 'Referendum') {
          foundReferendum = true;
        }
      });
      expect(foundReferendum).toBe(true);

      // Check results table header for referendum
      let foundOptionHeader = false;
      worksheet.eachRow((row, rowNumber) => {
        const cellValue = row.getCell(1).value;
        if (cellValue === 'Option') {
          foundOptionHeader = true;
          expect(row.getCell(2).value).toBe('Votes');
          expect(row.getCell(3).value).toBe('Percentage');
          expect(row.getCell(4).value).toBe('Status');
        }
      });
      expect(foundOptionHeader).toBe(true);

      // Check referendum results data (German labels: Ja, Nein, Enthaltung)
      let foundYesVote = false;
      let foundNoVote = false;
      worksheet.eachRow((row, rowNumber) => {
        const option = row.getCell(1).value;
        if (option === 'Ja') {
          foundYesVote = true;
          expect(row.getCell(2).value).toBe(6);
          expect(row.getCell(3).value).toBe('60%');
          expect(row.getCell(4).value).toBe('Angenommen');
        }
        if (option === 'Nein') {
          foundNoVote = true;
          expect(row.getCell(2).value).toBe(4);
          expect(row.getCell(3).value).toBe('40%');
        }
      });
      expect(foundYesVote).toBe(true);
      expect(foundNoVote).toBe(true);
    });

    it('should generate Excel for referendum with abstain votes', async () => {
      const mockResultId = '012e4567-e89b-12d3-a456-426614174000';
      const mockResultData = {
        rows: [
          {
            id: mockResultId,
            version: 1,
            is_final: false,
            counted_at: '2025-11-29T10:00:00Z',
            counted_by: 'admin',
            election_id: '123e4567-e89b-12d3-a456-426614174000',
            election_name: 'Policy Referendum',
            description: 'Vote on policy change',
            election_type: 'referendum',
            counting_method: 'yes_no_referendum',
            seats_to_fill: 1,
            votes_per_ballot: 1,
            election_start: '2025-11-01T00:00:00Z',
            election_end: '2025-11-10T23:59:59Z',
            total_ballots: 100,
            valid_ballots: 100,
            invalid_ballots: 0,
            validity_rate: 100.0,
            result_data: {
              yes_votes: 40,
              no_votes: 50,
              abstain_votes: 10,
              yes_percentage: 40.0,
              no_percentage: 50.0,
              abstain_percentage: 10.0,
              result: 'REJECTED',
            },
          },
        ],
      };

      mockDb.query.mockResolvedValue(mockResultData);

      const buffer = await generateElectionResultExcel(mockResultId);
      expect(buffer).toBeInstanceOf(Buffer);

      // Parse Excel to verify abstain votes
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const worksheet = workbook.getWorksheet('Election Result');

      // Check for abstain row (German: Enthaltung)
      let foundAbstain = false;
      worksheet.eachRow((row, rowNumber) => {
        const option = row.getCell(1).value;
        if (option === 'Enthaltung') {
          foundAbstain = true;
          expect(row.getCell(2).value).toBe(10);
          expect(row.getCell(3).value).toBe('10%');
        }
      });
      expect(foundAbstain).toBe(true);
    });
  });

  describe('Proportional Representation Elections', () => {
    it('should generate Excel for Sainte-Laguë allocation', async () => {
      const mockResultId = '345e4567-e89b-12d3-a456-426614174000';
      const mockResultData = {
        rows: [
          {
            id: mockResultId,
            version: 1,
            is_final: true,
            counted_at: '2025-11-29T10:00:00Z',
            counted_by: 'admin',
            election_id: '456e4567-e89b-12d3-a456-426614174000',
            election_name: 'Parliament Election',
            description: 'National parliament election',
            election_type: 'proportional_representation',
            counting_method: 'sainte_lague',
            seats_to_fill: 5,
            votes_per_ballot: 1,
            election_start: '2025-11-01T00:00:00Z',
            election_end: '2025-11-10T23:59:59Z',
            total_ballots: 1000,
            valid_ballots: 980,
            invalid_ballots: 20,
            validity_rate: 98.0,
            result_data: {
              allocation: [
                {
                  listnum: 1,
                  firstname: 'Party',
                  lastname: 'A',
                  votes: 400,
                  seats: 2,
                  percentage: 40.82,
                },
                {
                  listnum: 2,
                  firstname: 'Party',
                  lastname: 'B',
                  votes: 350,
                  seats: 2,
                  percentage: 35.71,
                },
                {
                  listnum: 3,
                  firstname: 'Party',
                  lastname: 'C',
                  votes: 230,
                  seats: 1,
                  percentage: 23.47,
                },
              ],
            },
          },
        ],
      };

      mockDb.query.mockResolvedValue(mockResultData);

      const buffer = await generateElectionResultExcel(mockResultId);
      expect(buffer).toBeInstanceOf(Buffer);

      // Parse Excel to verify proportional representation
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const worksheet = workbook.getWorksheet('Election Result');

      // Check for seats column
      let foundSeatsHeader = false;
      worksheet.eachRow((row, rowNumber) => {
        const cellValue = row.getCell(4).value;
        if (cellValue === 'Seats') {
          foundSeatsHeader = true;
        }
      });
      expect(foundSeatsHeader).toBe(true);

      // Verify seat allocation
      let foundPartyA = false;
      worksheet.eachRow((row, rowNumber) => {
        const candidate = row.getCell(2).value;
        if (candidate === 'Party A') {
          foundPartyA = true;
          expect(row.getCell(3).value).toBe(400); // votes
          expect(row.getCell(4).value).toBe(2); // seats
          expect(row.getCell(5).value).toBe('40.82%'); // percentage
        }
      });
      expect(foundPartyA).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should throw error if result not found', async () => {
      const mockResultId = '999e4567-e89b-12d3-a456-426614174000';
      mockDb.query.mockResolvedValue({ rows: [] });

      await expect(generateElectionResultExcel(mockResultId)).rejects.toThrow(
        `Election result with ID ${mockResultId} not found`,
      );

      expect(mockDb.release).toHaveBeenCalledTimes(1);
    });

    it('should log and throw error on database failure', async () => {
      const mockResultId = '999e4567-e89b-12d3-a456-426614174000';
      const dbError = new Error('Database connection failed');
      mockDb.query.mockRejectedValue(dbError);

      await expect(generateElectionResultExcel(mockResultId)).rejects.toThrow(
        'Database connection failed',
      );

      expect(logger.error).toHaveBeenCalledWith('Error generating Excel export:', dbError);
      expect(mockDb.release).toHaveBeenCalledTimes(1);
    });

    it('should release database connection on success', async () => {
      const mockResultId = '123e4567-e89b-12d3-a456-426614174000';
      const mockResultData = {
        rows: [
          {
            id: mockResultId,
            version: 1,
            is_final: false,
            counted_at: '2025-11-29T10:00:00Z',
            counted_by: 'admin',
            election_id: '234e4567-e89b-12d3-a456-426614174000',
            election_name: 'Test Election',
            description: 'Test',
            election_type: 'majority_vote',
            counting_method: 'highest_votes_absolute',
            seats_to_fill: 1,
            votes_per_ballot: 1,
            election_start: '2025-11-01T00:00:00Z',
            election_end: '2025-11-10T23:59:59Z',
            total_ballots: 10,
            valid_ballots: 10,
            invalid_ballots: 0,
            validity_rate: 100.0,
            result_data: {
              all_candidates: [],
            },
          },
        ],
      };

      mockDb.query.mockResolvedValue(mockResultData);

      await generateElectionResultExcel(mockResultId);

      expect(mockDb.release).toHaveBeenCalledTimes(1);
    });
  });

  describe('Excel Formatting', () => {
    it('should set correct column widths', async () => {
      const mockResultId = '123e4567-e89b-12d3-a456-426614174000';
      const mockResultData = {
        rows: [
          {
            id: mockResultId,
            version: 1,
            is_final: false,
            counted_at: '2025-11-29T10:00:00Z',
            counted_by: 'admin',
            election_id: '234e4567-e89b-12d3-a456-426614174000',
            election_name: 'Test',
            description: 'Test',
            election_type: 'majority_vote',
            counting_method: 'highest_votes_absolute',
            seats_to_fill: 1,
            votes_per_ballot: 1,
            election_start: '2025-11-01T00:00:00Z',
            election_end: '2025-11-10T23:59:59Z',
            total_ballots: 10,
            valid_ballots: 10,
            invalid_ballots: 0,
            validity_rate: 100.0,
            result_data: { all_candidates: [] },
          },
        ],
      };

      mockDb.query.mockResolvedValue(mockResultData);

      const buffer = await generateElectionResultExcel(mockResultId);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const worksheet = workbook.getWorksheet('Election Result');

      // Verify column widths
      expect(worksheet.getColumn(1).width).toBe(25);
      expect(worksheet.getColumn(2).width).toBe(20);
      expect(worksheet.getColumn(3).width).toBe(15);
      expect(worksheet.getColumn(4).width).toBe(15);
      expect(worksheet.getColumn(5).width).toBe(15);
    });

    it('should apply bold formatting to section headers', async () => {
      const mockResultId = '123e4567-e89b-12d3-a456-426614174000';
      const mockResultData = {
        rows: [
          {
            id: mockResultId,
            version: 1,
            is_final: false,
            counted_at: '2025-11-29T10:00:00Z',
            counted_by: 'admin',
            election_id: '234e4567-e89b-12d3-a456-426614174000',
            election_name: 'Test',
            description: 'Test',
            election_type: 'majority_vote',
            counting_method: 'highest_votes_absolute',
            seats_to_fill: 1,
            votes_per_ballot: 1,
            election_start: '2025-11-01T00:00:00Z',
            election_end: '2025-11-10T23:59:59Z',
            total_ballots: 10,
            valid_ballots: 10,
            invalid_ballots: 0,
            validity_rate: 100.0,
            result_data: { all_candidates: [] },
          },
        ],
      };

      mockDb.query.mockResolvedValue(mockResultData);

      const buffer = await generateElectionResultExcel(mockResultId);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const worksheet = workbook.getWorksheet('Election Result');

      // Check section headers are bold
      expect(worksheet.getCell('A1').font.bold).toBe(true);
      expect(worksheet.getCell('A1').font.size).toBe(14);
    });
  });
});
