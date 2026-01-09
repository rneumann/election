import { describe, test, expect } from 'vitest';
import { voterSchema, voterListSchema, EXPECTED_CSV_HEADERS } from '../voter.schema.js';

const VALID_RZ_KENNUNG = 'abcd1234';
const VALID_FACULTY = 'IW';
const VALID_FIRST_NAME = 'Max';
const VALID_LAST_NAME = 'Mustermann';
const VALID_MATKNR = '123456';

describe('Voter Schema Validation', () => {
  describe('voterSchema', () => {
    test('should validate correct voter data', () => {
      const validVoter = {
        'RZ-Kennung': VALID_RZ_KENNUNG,
        Fakultät: VALID_FACULTY,
        Vorname: VALID_FIRST_NAME,
        Nachname: VALID_LAST_NAME,
        'Matr.Nr': VALID_MATKNR,
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
        'Matr.Nr': VALID_MATKNR,
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
        'Matr.Nr': VALID_MATKNR,
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
        'Matr.Nr': '123abc', // contains letters
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
        'Matr.Nr': VALID_MATKNR,
      };

      const result = voterSchema.safeParse(invalidVoter);
      expect(result.success).toBe(false);
    });

    test('should allow optional matriculation number', () => {
      const voter = {
        'RZ-Kennung': VALID_RZ_KENNUNG,
        Fakultät: VALID_FACULTY,
        Vorname: VALID_FIRST_NAME,
        Nachname: VALID_LAST_NAME,
        // Matr.Nr is optional
      };

      const result = voterSchema.safeParse(voter);
      expect(result.success).toBe(true);
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
          'Matr.Nr': VALID_MATKNR,
        },
        {
          'RZ-Kennung': 'efgh5678',
          Fakultät: 'AB',
          Vorname: 'Anna',
          Nachname: 'Schmidt',
          'Matr.Nr': '234567',
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
        'Matr.Nr',
      ]);
    });
  });
});
