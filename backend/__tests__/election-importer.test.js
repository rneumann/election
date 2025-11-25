// __tests__/election-importer.test.js
import { describe, test, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import ExcelJS from 'exceljs';
import { importElectionData } from '../src/service/election-importer.js';
import { client } from '../src/database/db.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock Logger
vi.mock('../src/conf/logger/logger.js', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('Election Importer - election_type and counting_method', () => {
  const fixturesDir = path.join(__dirname, 'fixtures');
  let testElectionIds = [];

  beforeAll(async () => {
    // Create fixtures directory
    await fs.mkdir(fixturesDir, { recursive: true });
  });

  afterEach(async () => {
    // Cleanup: Delete test elections after each test
    if (testElectionIds.length > 0) {
      try {
        await client.query(`DELETE FROM elections WHERE id = ANY($1::uuid[])`, [testElectionIds]);
      } catch (error) {
        console.error('Cleanup error:', error);
      }
      testElectionIds = [];
    }
  });

  afterAll(async () => {
    // Cleanup: Remove all fixture files
    try {
      const files = await fs.readdir(fixturesDir);
      await Promise.all(
        files.map((file) => fs.unlink(path.join(fixturesDir, file)).catch(() => {})),
      );
      await fs.rmdir(fixturesDir);
    } catch (error) {
      // Directory might not exist, ignore
    }
  });

  /**
   * Helper function to create Excel test files
   * @param {string} filename - Name of the Excel file
   * @param {Array} elections - Array of election objects
   * @returns {Promise<string>} Path to created file
   */
  const createTestExcel = async (filename, elections) => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Elections');

    // Global dates
    sheet.getCell('D3').value = '01.01.2025';
    sheet.getCell('D4').value = '31.12.2025';

    // Header row (row 7 for readability)
    const headers = ['Kennung', 'Info', 'Listen', 'Sitze', 'Kum', 'Fak', 'Kurse', 'Typ', 'Methode'];
    headers.forEach((header, index) => {
      sheet.getCell(7, index + 1).value = header;
    });

    // Data rows starting at row 8
    elections.forEach((election, index) => {
      const row = 8 + index;
      sheet.getCell(`A${row}`).value = election.identifier;
      sheet.getCell(`B${row}`).value = election.info;
      sheet.getCell(`C${row}`).value = election.listvotes ?? '0';
      sheet.getCell(`D${row}`).value = election.seats ?? 1;
      sheet.getCell(`E${row}`).value = election.maxKum ?? 0;
      sheet.getCell(`F${row}`).value = election.faculties ?? '';
      sheet.getCell(`G${row}`).value = election.courses ?? '';
      sheet.getCell(`H${row}`).value = election.electionTypeCode;
      sheet.getCell(`I${row}`).value = election.countingMethodCode;
    });

    const filePath = path.join(fixturesDir, filename);
    await workbook.xlsx.writeFile(filePath);
    return filePath;
  };

  /**
   * Helper to store election IDs for cleanup
   */
  const storeTestElectionIds = async (descriptionPattern) => {
    const result = await client.query(`SELECT id FROM elections WHERE description LIKE $1`, [
      descriptionPattern,
    ]);
    testElectionIds.push(...result.rows.map((r) => r.id));
  };

  describe('Valid Imports', () => {
    test('should import election with election_type=majority_vote and counting_method=highest_votes', async () => {
      const filePath = await createTestExcel('valid-majority-vote.xlsx', [
        {
          identifier: 'TEST-MAJORITY-001',
          info: 'Test Mehrheitswahl',
          listvotes: '0',
          seats: 3,
          maxKum: 0,
          faculties: 'IWI',
          electionTypeCode: 1, // majority_vote
          countingMethodCode: 3, // highest_votes
        },
      ]);

      await importElectionData(filePath);

      const result = await client.query(
        `SELECT info, description, election_type, counting_method 
         FROM elections 
         WHERE description = $1`,
        ['TEST-MAJORITY-001'],
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].info).toBe('Test Mehrheitswahl');
      expect(result.rows[0].election_type).toBe('majority_vote');
      expect(result.rows[0].counting_method).toBe('highest_votes');

      await storeTestElectionIds('TEST-MAJORITY-001');
    });

    test('should import election with election_type=proportional_representation and counting_method=sainte_lague', async () => {
      const filePath = await createTestExcel('valid-proportional.xlsx', [
        {
          identifier: 'TEST-PROP-001',
          info: 'Test Verhältniswahl',
          listvotes: '1',
          seats: 15,
          faculties: 'IWI,MMT',
          electionTypeCode: 2, // proportional_representation
          countingMethodCode: 1, // sainte_lague
        },
      ]);

      await importElectionData(filePath);

      const result = await client.query(
        `SELECT info, election_type, counting_method, listvotes 
         FROM elections 
         WHERE description = $1`,
        ['TEST-PROP-001'],
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].info).toBe('Test Verhältniswahl');
      expect(result.rows[0].election_type).toBe('proportional_representation');
      expect(result.rows[0].counting_method).toBe('sainte_lague');
      expect(result.rows[0].listvotes).toBe(1);

      await storeTestElectionIds('TEST-PROP-001');
    });

    test('should import election with election_type=referendum and counting_method=yes_no_referendum', async () => {
      const filePath = await createTestExcel('valid-referendum.xlsx', [
        {
          identifier: 'TEST-REF-001',
          info: 'Test Urabstimmung',
          seats: 1,
          faculties: 'IWI,MMT,AB',
          electionTypeCode: 3, // referendum
          countingMethodCode: 4, // yes_no_referendum
        },
      ]);

      await importElectionData(filePath);

      const result = await client.query(
        `SELECT info, election_type, counting_method 
         FROM elections 
         WHERE description = $1`,
        ['TEST-REF-001'],
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].info).toBe('Test Urabstimmung');
      expect(result.rows[0].election_type).toBe('referendum');
      expect(result.rows[0].counting_method).toBe('yes_no_referendum');

      await storeTestElectionIds('TEST-REF-001');
    });

    test('should import multiple elections with different types in one file', async () => {
      const filePath = await createTestExcel('valid-multiple.xlsx', [
        {
          identifier: 'TEST-MULTI-001',
          info: 'Mehrheitswahl',
          electionTypeCode: 1,
          countingMethodCode: 3,
        },
        {
          identifier: 'TEST-MULTI-002',
          info: 'Verhältniswahl',
          electionTypeCode: 2,
          countingMethodCode: 2, // hare_niemeyer
        },
        {
          identifier: 'TEST-MULTI-003',
          info: 'Referendum',
          electionTypeCode: 3,
          countingMethodCode: 4,
        },
      ]);

      await importElectionData(filePath);

      const result = await client.query(
        `SELECT description, election_type, counting_method 
         FROM elections 
         WHERE description LIKE $1 
         ORDER BY description`,
        ['TEST-MULTI-%'],
      );

      expect(result.rows).toHaveLength(3);
      expect(result.rows[0].election_type).toBe('majority_vote');
      expect(result.rows[1].election_type).toBe('proportional_representation');
      expect(result.rows[1].counting_method).toBe('hare_niemeyer');
      expect(result.rows[2].election_type).toBe('referendum');

      await storeTestElectionIds('TEST-MULTI-%');
    });
  });

  describe('Invalid election_type codes', () => {
    test('should reject invalid election_type code (99)', async () => {
      const filePath = await createTestExcel('invalid-type-99.xlsx', [
        {
          identifier: 'TEST-INVALID-TYPE-99',
          info: 'Invalid Type',
          electionTypeCode: 99,
          countingMethodCode: 1,
        },
      ]);

      await expect(importElectionData(filePath)).rejects.toThrow(
        /Invalid election_type code '99' in row 8/,
      );
    });

    test('should reject invalid election_type code (0)', async () => {
      const filePath = await createTestExcel('invalid-type-0.xlsx', [
        {
          identifier: 'TEST-INVALID-TYPE-0',
          info: 'Invalid Type Zero',
          electionTypeCode: 0,
          countingMethodCode: 1,
        },
      ]);

      await expect(importElectionData(filePath)).rejects.toThrow(
        /Invalid election_type code '0' in row 8/,
      );
    });

    test('should reject invalid election_type code (4)', async () => {
      const filePath = await createTestExcel('invalid-type-4.xlsx', [
        {
          identifier: 'TEST-INVALID-TYPE-4',
          info: 'Invalid Type Four',
          electionTypeCode: 4,
          countingMethodCode: 1,
        },
      ]);

      await expect(importElectionData(filePath)).rejects.toThrow(
        /Invalid election_type code '4' in row 8/,
      );
    });

    test('should reject string value in election_type', async () => {
      const filePath = await createTestExcel('invalid-type-string.xlsx', [
        {
          identifier: 'TEST-INVALID-TYPE-STR',
          info: 'Invalid Type String',
          electionTypeCode: 'majority',
          countingMethodCode: 1,
        },
      ]);

      await expect(importElectionData(filePath)).rejects.toThrow(/Invalid election_type code/);
    });
  });

  describe('Invalid counting_method codes', () => {
    test('should reject invalid counting_method code (99)', async () => {
      const filePath = await createTestExcel('invalid-method-99.xlsx', [
        {
          identifier: 'TEST-INVALID-METHOD-99',
          info: 'Invalid Method',
          electionTypeCode: 1,
          countingMethodCode: 99,
        },
      ]);

      await expect(importElectionData(filePath)).rejects.toThrow(
        /Invalid counting_method code '99' in row 8/,
      );
    });

    test('should reject invalid counting_method code (0)', async () => {
      const filePath = await createTestExcel('invalid-method-0.xlsx', [
        {
          identifier: 'TEST-INVALID-METHOD-0',
          info: 'Invalid Method Zero',
          electionTypeCode: 1,
          countingMethodCode: 0,
        },
      ]);

      await expect(importElectionData(filePath)).rejects.toThrow(
        /Invalid counting_method code '0' in row 8/,
      );
    });

    test('should reject invalid counting_method code (5)', async () => {
      const filePath = await createTestExcel('invalid-method-5.xlsx', [
        {
          identifier: 'TEST-INVALID-METHOD-5',
          info: 'Invalid Method Five',
          electionTypeCode: 1,
          countingMethodCode: 5,
        },
      ]);

      await expect(importElectionData(filePath)).rejects.toThrow(
        /Invalid counting_method code '5' in row 8/,
      );
    });
  });

  describe('Missing values', () => {
    test('should reject missing election_type (column H empty)', async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Elections');
      sheet.getCell('D3').value = '01.01.2025';
      sheet.getCell('D4').value = '31.12.2025';
      sheet.getCell('A8').value = 'TEST-MISSING-TYPE';
      sheet.getCell('B8').value = 'Missing Type';
      sheet.getCell('C8').value = '0';
      sheet.getCell('D8').value = 1;
      // H8 is empty
      sheet.getCell('I8').value = 1;

      const filePath = path.join(fixturesDir, 'missing-type.xlsx');
      await workbook.xlsx.writeFile(filePath);

      await expect(importElectionData(filePath)).rejects.toThrow(
        /Missing election_type \(column H\) in row 8/,
      );
    });

    test('should reject missing counting_method (column I empty)', async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Elections');
      sheet.getCell('D3').value = '01.01.2025';
      sheet.getCell('D4').value = '31.12.2025';
      sheet.getCell('A8').value = 'TEST-MISSING-METHOD';
      sheet.getCell('B8').value = 'Missing Method';
      sheet.getCell('C8').value = '0';
      sheet.getCell('D8').value = 1;
      sheet.getCell('H8').value = 1;
      // I8 is empty

      const filePath = path.join(fixturesDir, 'missing-method.xlsx');
      await workbook.xlsx.writeFile(filePath);

      await expect(importElectionData(filePath)).rejects.toThrow(
        /Missing counting_method \(column I\) in row 8/,
      );
    });
  });

  describe('All valid combinations', () => {
    test('should accept all valid election_type codes (1-3)', async () => {
      const elections = [
        { identifier: 'TEST-TYPE-1', info: 'Type 1', electionTypeCode: 1, countingMethodCode: 3 },
        { identifier: 'TEST-TYPE-2', info: 'Type 2', electionTypeCode: 2, countingMethodCode: 1 },
        { identifier: 'TEST-TYPE-3', info: 'Type 3', electionTypeCode: 3, countingMethodCode: 4 },
      ];

      const filePath = await createTestExcel('all-types.xlsx', elections);
      await importElectionData(filePath);

      const result = await client.query(
        `SELECT description, election_type 
         FROM elections 
         WHERE description LIKE $1 
         ORDER BY description`,
        ['TEST-TYPE-%'],
      );

      expect(result.rows).toHaveLength(3);
      expect(result.rows[0].election_type).toBe('majority_vote');
      expect(result.rows[1].election_type).toBe('proportional_representation');
      expect(result.rows[2].election_type).toBe('referendum');

      await storeTestElectionIds('TEST-TYPE-%');
    });

    test('should accept all valid counting_method codes (1-4)', async () => {
      const elections = [
        {
          identifier: 'TEST-METHOD-1',
          info: 'Method Sainte-Laguë',
          electionTypeCode: 2,
          countingMethodCode: 1,
        },
        {
          identifier: 'TEST-METHOD-2',
          info: 'Method Hare-Niemeyer',
          electionTypeCode: 2,
          countingMethodCode: 2,
        },
        {
          identifier: 'TEST-METHOD-3',
          info: 'Method Highest Votes',
          electionTypeCode: 1,
          countingMethodCode: 3,
        },
        {
          identifier: 'TEST-METHOD-4',
          info: 'Method Referendum',
          electionTypeCode: 3,
          countingMethodCode: 4,
        },
      ];

      const filePath = await createTestExcel('all-methods.xlsx', elections);
      await importElectionData(filePath);

      const result = await client.query(
        `SELECT description, counting_method 
         FROM elections 
         WHERE description LIKE $1 
         ORDER BY description`,
        ['TEST-METHOD-%'],
      );

      expect(result.rows).toHaveLength(4);
      expect(result.rows[0].counting_method).toBe('sainte_lague');
      expect(result.rows[1].counting_method).toBe('hare_niemeyer');
      expect(result.rows[2].counting_method).toBe('highest_votes');
      expect(result.rows[3].counting_method).toBe('yes_no_referendum');

      await storeTestElectionIds('TEST-METHOD-%');
    });
  });

  describe('Database rollback on error', () => {
    test('should rollback transaction if error occurs in middle of import', async () => {
      const elections = [
        {
          identifier: 'TEST-ROLLBACK-1',
          info: 'Valid Election 1',
          electionTypeCode: 1,
          countingMethodCode: 3,
        },
        {
          identifier: 'TEST-ROLLBACK-2',
          info: 'Invalid Election',
          electionTypeCode: 99, // This will cause error
          countingMethodCode: 3,
        },
        {
          identifier: 'TEST-ROLLBACK-3',
          info: 'Valid Election 3',
          electionTypeCode: 1,
          countingMethodCode: 3,
        },
      ];

      const filePath = await createTestExcel('rollback-test.xlsx', elections);

      await expect(importElectionData(filePath)).rejects.toThrow();

      // Verify NO elections were imported (rollback worked)
      const result = await client.query(
        `SELECT COUNT(*) FROM elections WHERE description LIKE $1`,
        ['TEST-ROLLBACK-%'],
      );

      expect(Number(result.rows[0].count)).toBe(0);
    });
  });
});
