import { describe, test, expect } from 'vitest';
import { voterSchema, voterListSchema, EXPECTED_CSV_HEADERS } from '../voter.schema.js';

const VALID_RZ_KENNUNG = 'abcd1234';
const VALID_FACULTY = 'IW';
const VALID_FIRST_NAME = 'Max';
const VALID_LAST_NAME = 'Mustermann';
const VALID_MATKNR = '123456';
const VALID_PROGRAM_CODE = 'INFB';
const VALID_PROGRAM = 'Informatik Bachelor';

describe('Voter Schema Validation', () => {
  describe('voterSchema', () => {
    test('should validate correct voter data', () => {
      const validVoter = {
        'RZ-Kennung': VALID_RZ_KENNUNG,
        Fakultät: VALID_FACULTY,
        Vorname: VALID_FIRST_NAME,
        Nachname: VALID_LAST_NAME,
        'Matk.Nr': VALID_MATKNR,
        Studienganskürzel: VALID_PROGRAM_CODE,
        Studiengang: VALID_PROGRAM,
      };

      const result = voterSchema.safeParse(validVoter);
      expect(result.success).toBe(true);
    });

    test('should reject invalid RZ-Kennung format', () => {
      const invalidVoter = {
        'RZ-Kennung': 'ABCD1234', // uppercase
        Fakultät: VALID_FACULTY,
        Vorname: VALID_FIRST_NAME,
        Nachname: VALID_LAST_NAME,
        'Matk.Nr': VALID_MATKNR,
        Studienganskürzel: VALID_PROGRAM_CODE,
        Studiengang: VALID_PROGRAM,
      };

      const result = voterSchema.safeParse(invalidVoter);
      expect(result.success).toBe(false);
      if (!result.success && result.error.errors && result.error.errors.length > 0) {
        expect(result.error.errors[0].message).toContain('abcd1234');
      }
    });

    test('should reject invalid faculty code', () => {
      const invalidVoter = {
        'RZ-Kennung': VALID_RZ_KENNUNG,
        Fakultät: 'xyz', // lowercase instead of uppercase
        Vorname: VALID_FIRST_NAME,
        Nachname: VALID_LAST_NAME,
        'Matk.Nr': VALID_MATKNR,
        Studienganskürzel: VALID_PROGRAM_CODE,
        Studiengang: VALID_PROGRAM,
      };

      const result = voterSchema.safeParse(invalidVoter);
      expect(result.success).toBe(false);
      if (!result.success && result.error.errors && result.error.errors.length > 0) {
        expect(result.error.errors[0].message).toContain('Großbuchstaben');
      }
    });

    test('should reject non-numeric matriculation number', () => {
      const invalidVoter = {
        'RZ-Kennung': VALID_RZ_KENNUNG,
        Fakultät: VALID_FACULTY,
        Vorname: VALID_FIRST_NAME,
        Nachname: VALID_LAST_NAME,
        'Matk.Nr': '123abc', // contains letters
        Studienganskürzel: VALID_PROGRAM_CODE,
        Studiengang: VALID_PROGRAM,
      };

      const result = voterSchema.safeParse(invalidVoter);
      expect(result.success).toBe(false);
    });

    test('should reject empty required fields', () => {
      const invalidVoter = {
        'RZ-Kennung': VALID_RZ_KENNUNG,
        Fakultät: VALID_FACULTY,
        Vorname: '', // empty
        Nachname: VALID_LAST_NAME,
        'Matk.Nr': VALID_MATKNR,
        Studienganskürzel: VALID_PROGRAM_CODE,
        Studiengang: VALID_PROGRAM,
      };

      const result = voterSchema.safeParse(invalidVoter);
      expect(result.success).toBe(false);
    });

    test('should auto-uppercase Studienganskürzel', () => {
      const voter = {
        'RZ-Kennung': VALID_RZ_KENNUNG,
        Fakultät: VALID_FACULTY,
        Vorname: VALID_FIRST_NAME,
        Nachname: VALID_LAST_NAME,
        'Matk.Nr': VALID_MATKNR,
        Studienganskürzel: 'infb', // lowercase
        Studiengang: VALID_PROGRAM,
      };

      const result = voterSchema.safeParse(voter);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.Studienganskürzel).toBe('INFB');
      }
    });
  });

  describe('voterListSchema', () => {
    test('should validate array of voters', () => {
      const voters = [
        {
          'RZ-Kennung': VALID_RZ_KENNUNG,
          Fakultät: VALID_FACULTY,
          Vorname: VALID_FIRST_NAME,
          Nachname: VALID_LAST_NAME,
          'Matk.Nr': VALID_MATKNR,
          Studienganskürzel: VALID_PROGRAM_CODE,
          Studiengang: VALID_PROGRAM,
        },
        {
          'RZ-Kennung': 'efgh5678',
          Fakultät: 'AB',
          Vorname: 'Anna',
          Nachname: 'Schmidt',
          'Matk.Nr': '234567',
          Studienganskürzel: 'ARTB',
          Studiengang: 'Architektur Bachelor',
        },
      ];

      const result = voterListSchema.safeParse(voters);
      expect(result.success).toBe(true);
    });

    test('should reject empty voter list', () => {
      const result = voterListSchema.safeParse([]);
      expect(result.success).toBe(false);
      if (!result.success && result.error.errors && result.error.errors.length > 0) {
        expect(result.error.errors[0].message).toContain('mindestens einen');
      }
    });
  });

  describe('EXPECTED_CSV_HEADERS', () => {
    test('should have correct header order', () => {
      expect(EXPECTED_CSV_HEADERS).toEqual([
        'RZ-Kennung',
        'Fakultät',
        'Vorname',
        'Nachname',
        'Matk.Nr',
        'Studienganskürzel',
        'Studiengang',
      ]);
    });
  });
});
