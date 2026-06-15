import { describe, test, expect, vi, beforeEach } from 'vitest';
import { validateVoterCSV } from '../csvValidator.js';

// Test data constants
const VALID_PROGRAM_INFB = 'Informatik Bachelor';
const VALID_PROGRAM_ARTB = 'Architektur Bachelor';

// Mock the parser
vi.mock('../../parsers/csvParser.js', () => ({
  parseVoterCSV: vi.fn(),
}));

import { parseVoterCSV } from '../../parsers/csvParser.js';

describe('CSV Validator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should return parse errors if parsing fails', async () => {
    parseVoterCSV.mockResolvedValue({
      success: false,
      errors: [
        {
          row: 1,
          field: 'Kopfzeile',
          message: 'Fehlende Spalten: Vorname',
          code: 'MISSING_HEADERS',
        },
      ],
    });

    const mockFile = new File(['test'], 'test.csv', { type: 'text/csv' });
    const result = await validateVoterCSV(mockFile);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe('MISSING_HEADERS');
  });

  test('should validate correct data and return stats', async () => {
    parseVoterCSV.mockResolvedValue({
      success: true,
      data: [
        {
          'RZ-Kennung': 'abcd1234',
          Fakultät: 'IW',
          Vorname: 'Max',
          Nachname: 'Mustermann',
          'Matr.Nr': '123456',
          Studienganskürzel: 'INFB',
          Studiengang: VALID_PROGRAM_INFB,
        },
        {
          'RZ-Kennung': 'efgh5678',
          Fakultät: 'AB',
          Vorname: 'Anna',
          Nachname: 'Schmidt',
          'Matr.Nr': '234567',
          Studienganskürzel: 'ARTB',
          Studiengang: VALID_PROGRAM_ARTB,
        },
      ],
    });

    const mockFile = new File(['test'], 'test.csv', { type: 'text/csv' });
    const result = await validateVoterCSV(mockFile);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.stats.totalVoters).toBe(2);
    expect(result.stats.faculties).toBe(2);
    expect(result.stats.facultyList).toEqual(['AB', 'IW']);
  });

  test('should detect duplicate RZ-Kennungen', async () => {
    parseVoterCSV.mockResolvedValue({
      success: true,
      data: [
        {
          'RZ-Kennung': 'abcd1234',
          Fakultät: 'IW',
          Vorname: 'Max',
          Nachname: 'Mustermann',
          'Matr.Nr': '123456',
          Studienganskürzel: 'INFB',
          Studiengang: VALID_PROGRAM_INFB,
        },
        {
          'RZ-Kennung': 'abcd1234', // duplicate
          Fakultät: 'AB',
          Vorname: 'Anna',
          Nachname: 'Schmidt',
          'Matr.Nr': '234567',
          Studienganskürzel: 'ARTB',
          Studiengang: VALID_PROGRAM_ARTB,
        },
      ],
    });

    const mockFile = new File(['test'], 'test.csv', { type: 'text/csv' });
    const result = await validateVoterCSV(mockFile);

    expect(result.success).toBe(false);
    expect(result.errors[0].code).toBe('DUPLICATE_UID');
    expect(result.errors[0].message).toContain('abcd1234');
  });

  test('should detect duplicate Matrikelnummern', async () => {
    parseVoterCSV.mockResolvedValue({
      success: true,
      data: [
        {
          'RZ-Kennung': 'abcd1234',
          Fakultät: 'IW',
          Vorname: 'Max',
          Nachname: 'Mustermann',
          'Matr.Nr': '123456',
          Studienganskürzel: 'INFB',
          Studiengang: VALID_PROGRAM_INFB,
        },
        {
          'RZ-Kennung': 'efgh5678',
          Fakultät: 'AB',
          Vorname: 'Anna',
          Nachname: 'Schmidt',
          'Matr.Nr': '123456', // duplicate
          Studienganskürzel: 'ARTB',
          Studiengang: VALID_PROGRAM_ARTB,
        },
      ],
    });

    const mockFile = new File(['test'], 'test.csv', { type: 'text/csv' });
    const result = await validateVoterCSV(mockFile);

    expect(result.success).toBe(false);
    expect(result.errors[0].code).toBe('DUPLICATE_MTKNR');
    expect(result.errors[0].message).toContain('123456');
  });

  test('should return validation errors for invalid data', async () => {
    parseVoterCSV.mockResolvedValue({
      success: true,
      data: [
        {
          'RZ-Kennung': 'INVALID', // wrong format
          Fakultät: 'IW',
          Vorname: 'Max',
          Nachname: 'Mustermann',
          'Matr.Nr': '123456',
          Studienganskürzel: 'INFB',
          Studiengang: VALID_PROGRAM_INFB,
        },
      ],
    });

    const mockFile = new File(['test'], 'test.csv', { type: 'text/csv' });
    const result = await validateVoterCSV(mockFile);

    expect(result.success).toBe(false);
    if (result.errors && result.errors.length > 0) {
      expect(result.errors[0].field).toBe('RZ-Kennung');
      expect(result.errors[0].row).toBe(2); // +1 for header, +1 for 0-index
    }
  });
});
