import { describe, it, expect } from 'vitest';
import { countReferendum } from '../../../src/counting/algorithms/referendum.js';

describe('Referendum Algorithm', () => {
  describe('Basic Functionality - Simple Majority', () => {
    it('should accept referendum with YES majority (simple majority)', () => {
      const votes = [
        { listnum: 1, votes: 600 }, // YES
        { listnum: 2, votes: 400 }, // NO
      ];

      const result = countReferendum({
        votes,
        config: { quorum: 0, majority_type: 'simple' },
      });

      expect(result.algorithm).toBe('yes_no_referendum');
      expect(result.result).toBe('ACCEPTED');
      expect(result.yes_votes).toBe(600);
      expect(result.no_votes).toBe(400);
      expect(result.yes_percentage).toBe('60.00');
      expect(result.no_percentage).toBe('40.00');
      expect(result.valid_votes).toBe(1000);
      expect(result.majority_type).toBe('simple');
    });

    it('should reject referendum with NO majority', () => {
      const votes = [
        { listnum: 1, votes: 400 }, // YES
        { listnum: 2, votes: 600 }, // NO
      ];

      const result = countReferendum({
        votes,
        config: { quorum: 0, majority_type: 'simple' },
      });

      expect(result.result).toBe('REJECTED');
      expect(result.yes_percentage).toBe('40.00');
      expect(result.no_percentage).toBe('60.00');
    });

    it('should reject referendum with exactly 50% YES (not >50%)', () => {
      const votes = [
        { listnum: 1, votes: 500 }, // YES
        { listnum: 2, votes: 500 }, // NO
      ];

      const result = countReferendum({
        votes,
        config: { quorum: 0, majority_type: 'simple' },
      });

      // 500 is NOT > 500 (threshold = 1000/2 = 500)
      expect(result.result).toBe('REJECTED');
      expect(result.yes_percentage).toBe('50.00');
    });

    it('should handle abstain votes correctly (simple majority)', () => {
      const votes = [
        { listnum: 1, votes: 400 }, // YES
        { listnum: 2, votes: 300 }, // NO
        { listnum: 3, votes: 300 }, // ABSTAIN
      ];

      const result = countReferendum({
        votes,
        config: { quorum: 0, majority_type: 'simple' },
      });

      // Simple majority: 400 > 350 (700/2) → ACCEPTED
      // Percentages based on valid votes only (700)
      expect(result.result).toBe('ACCEPTED');
      expect(result.abstain_votes).toBe(300);
      expect(result.valid_votes).toBe(700);
      expect(result.turnout).toBe(1000);
      expect(result.yes_percentage).toBe('57.14'); // 400/700
      expect(result.no_percentage).toBe('42.86'); // 300/700
    });
  });

  describe('Basic Functionality - Absolute Majority', () => {
    it('should accept referendum with YES majority (absolute majority)', () => {
      const votes = [
        { listnum: 1, votes: 600 }, // YES
        { listnum: 2, votes: 300 }, // NO
        { listnum: 3, votes: 100 }, // ABSTAIN
      ];

      const result = countReferendum({
        votes,
        config: { quorum: 0, majority_type: 'absolute' },
      });

      // Absolute majority: 600 > 500 (1000/2) → ACCEPTED
      expect(result.result).toBe('ACCEPTED');
      expect(result.yes_votes).toBe(600);
      expect(result.turnout).toBe(1000);
      expect(result.majority_type).toBe('absolute');
    });

    it('should reject when YES ≤50% of total votes (absolute majority)', () => {
      const votes = [
        { listnum: 1, votes: 500 }, // YES
        { listnum: 2, votes: 300 }, // NO
        { listnum: 3, votes: 200 }, // ABSTAIN
      ];

      const result = countReferendum({
        votes,
        config: { quorum: 0, majority_type: 'absolute' },
      });

      // Absolute majority: 500 is NOT > 500 (1000/2) → REJECTED
      expect(result.result).toBe('REJECTED');
      expect(result.majority_type).toBe('absolute');
    });

    it('should handle abstain votes differently in absolute majority', () => {
      const votes = [
        { listnum: 1, votes: 400 }, // YES
        { listnum: 2, votes: 300 }, // NO
        { listnum: 3, votes: 300 }, // ABSTAIN
      ];

      const result = countReferendum({
        votes,
        config: { quorum: 0, majority_type: 'absolute' },
      });

      // Absolute majority: 400 is NOT > 500 (1000/2) → REJECTED
      // Even though YES > NO, abstain counts against YES in absolute majority
      expect(result.result).toBe('REJECTED');
      expect(result.yes_percentage).toBe('57.14'); // Still calculated from valid votes
    });
  });

  describe('Quorum Checks', () => {
    it('should reject when quorum not reached (even with YES majority)', () => {
      const votes = [
        { listnum: 1, votes: 60 }, // YES (60% majority)
        { listnum: 2, votes: 40 }, // NO
      ];

      const result = countReferendum({
        votes,
        config: { quorum: 1000, majority_type: 'simple' },
      });

      expect(result.result).toBe('REJECTED');
      expect(result.quorum_required).toBe(1000);
      expect(result.quorum_reached).toBe(false);
      expect(result.turnout).toBe(100);
      expect(result.yes_percentage).toBe('60.00'); // YES has majority but quorum failed
    });

    it('should accept when both quorum and majority reached', () => {
      const votes = [
        { listnum: 1, votes: 600 }, // YES
        { listnum: 2, votes: 400 }, // NO
      ];

      const result = countReferendum({
        votes,
        config: { quorum: 500, majority_type: 'simple' },
      });

      expect(result.result).toBe('ACCEPTED');
      expect(result.quorum_reached).toBe(true);
      expect(result.turnout).toBe(1000);
    });

    it('should accept when quorum exactly met', () => {
      const votes = [
        { listnum: 1, votes: 600 }, // YES
        { listnum: 2, votes: 400 }, // NO
      ];

      const result = countReferendum({
        votes,
        config: { quorum: 1000, majority_type: 'simple' },
      });

      expect(result.result).toBe('ACCEPTED');
      expect(result.quorum_reached).toBe(true);
      expect(result.turnout).toBe(1000);
    });

    it('should handle quorum with abstain votes', () => {
      const votes = [
        { listnum: 1, votes: 400 }, // YES
        { listnum: 2, votes: 300 }, // NO
        { listnum: 3, votes: 300 }, // ABSTAIN
      ];

      const result = countReferendum({
        votes,
        config: { quorum: 900, majority_type: 'simple' },
      });

      // Turnout = 1000 ≥ 900 → quorum reached
      // YES = 400 > 350 (700/2) → majority reached
      expect(result.result).toBe('ACCEPTED');
      expect(result.quorum_reached).toBe(true);
      expect(result.turnout).toBe(1000);
    });

    it('should default to quorum 0 when not specified', () => {
      const votes = [
        { listnum: 1, votes: 60 }, // YES
        { listnum: 2, votes: 40 }, // NO
      ];

      const result = countReferendum({
        votes,
        config: { majority_type: 'simple' },
      });

      expect(result.result).toBe('ACCEPTED');
      expect(result.quorum_required).toBe(0);
      expect(result.quorum_reached).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero votes', () => {
      const votes = [
        { listnum: 1, votes: 0 }, // YES
        { listnum: 2, votes: 0 }, // NO
      ];

      const result = countReferendum({
        votes,
        config: { quorum: 0, majority_type: 'simple' },
      });

      expect(result.result).toBe('REJECTED');
      expect(result.yes_percentage).toBe('0.00');
      expect(result.no_percentage).toBe('0.00');
      expect(result.valid_votes).toBe(0);
    });

    it('should handle only YES votes', () => {
      const votes = [
        { listnum: 1, votes: 1000 }, // YES
        { listnum: 2, votes: 0 }, // NO
      ];

      const result = countReferendum({
        votes,
        config: { quorum: 0, majority_type: 'simple' },
      });

      expect(result.result).toBe('ACCEPTED');
      expect(result.yes_percentage).toBe('100.00');
      expect(result.no_percentage).toBe('0.00');
    });

    it('should handle only NO votes', () => {
      const votes = [
        { listnum: 1, votes: 0 }, // YES
        { listnum: 2, votes: 1000 }, // NO
      ];

      const result = countReferendum({
        votes,
        config: { quorum: 0, majority_type: 'simple' },
      });

      expect(result.result).toBe('REJECTED');
      expect(result.yes_percentage).toBe('0.00');
      expect(result.no_percentage).toBe('100.00');
    });

    it('should handle only ABSTAIN votes', () => {
      const votes = [
        { listnum: 1, votes: 0 }, // YES
        { listnum: 2, votes: 0 }, // NO
        { listnum: 3, votes: 1000 }, // ABSTAIN
      ];

      const result = countReferendum({
        votes,
        config: { quorum: 0, majority_type: 'simple' },
      });

      // No valid votes, but quorum 0 reached
      expect(result.result).toBe('REJECTED');
      expect(result.valid_votes).toBe(0);
      expect(result.turnout).toBe(1000);
      expect(result.yes_percentage).toBe('0.00');
    });

    it('should handle missing ABSTAIN option', () => {
      const votes = [
        { listnum: 1, votes: 600 }, // YES
        { listnum: 2, votes: 400 }, // NO
        // No listnum 3
      ];

      const result = countReferendum({
        votes,
        config: { quorum: 0, majority_type: 'simple' },
      });

      expect(result.result).toBe('ACCEPTED');
      expect(result.abstain_votes).toBe(0);
      expect(result.valid_votes).toBe(1000);
    });

    it('should handle missing YES option', () => {
      const votes = [
        { listnum: 2, votes: 1000 }, // NO
      ];

      const result = countReferendum({
        votes,
        config: { quorum: 0, majority_type: 'simple' },
      });

      expect(result.result).toBe('REJECTED');
      expect(result.yes_votes).toBe(0);
      expect(result.no_votes).toBe(1000);
    });

    it('should handle missing NO option', () => {
      const votes = [
        { listnum: 1, votes: 1000 }, // YES
      ];

      const result = countReferendum({
        votes,
        config: { quorum: 0, majority_type: 'simple' },
      });

      expect(result.result).toBe('ACCEPTED');
      expect(result.yes_votes).toBe(1000);
      expect(result.no_votes).toBe(0);
    });
  });

  describe('Input Validation', () => {
    it('should reject non-array votes', () => {
      expect(() =>
        countReferendum({
          votes: 'not an array',
          config: { quorum: 0, majority_type: 'simple' },
        }),
      ).toThrow('votes must be an array');
    });

    it('should reject missing config', () => {
      const votes = [
        { listnum: 1, votes: 100 },
        { listnum: 2, votes: 50 },
      ];

      expect(() => countReferendum({ votes, config: null })).toThrow('config must be an object');
    });

    it('should reject negative vote counts', () => {
      const votes = [
        { listnum: 1, votes: -100 }, // Negative votes
        { listnum: 2, votes: 50 },
      ];

      expect(() =>
        countReferendum({
          votes,
          config: { quorum: 0, majority_type: 'simple' },
        }),
      ).toThrow('Vote counts cannot be negative');
    });

    it('should handle empty votes array', () => {
      const result = countReferendum({
        votes: [],
        config: { quorum: 0, majority_type: 'simple' },
      });

      // Empty array → all votes = 0
      expect(result.result).toBe('REJECTED');
      expect(result.yes_votes).toBe(0);
      expect(result.no_votes).toBe(0);
    });
  });

  describe('Majority Type Defaults', () => {
    it('should default to simple majority when not specified', () => {
      const votes = [
        { listnum: 1, votes: 400 }, // YES
        { listnum: 2, votes: 300 }, // NO
        { listnum: 3, votes: 300 }, // ABSTAIN
      ];

      const result = countReferendum({
        votes,
        config: { quorum: 0 },
      });

      // Simple majority (default): 400 > 350 (700/2) → ACCEPTED
      expect(result.result).toBe('ACCEPTED');
      expect(result.majority_type).toBe('simple');
    });
  });

  describe('Output Format', () => {
    it('should return all required fields', () => {
      const votes = [
        { listnum: 1, votes: 600 },
        { listnum: 2, votes: 400 },
      ];

      const result = countReferendum({
        votes,
        config: { quorum: 500, majority_type: 'simple' },
      });

      expect(result).toHaveProperty('algorithm');
      expect(result).toHaveProperty('result');
      expect(result).toHaveProperty('yes_votes');
      expect(result).toHaveProperty('no_votes');
      expect(result).toHaveProperty('abstain_votes');
      expect(result).toHaveProperty('yes_percentage');
      expect(result).toHaveProperty('no_percentage');
      expect(result).toHaveProperty('turnout');
      expect(result).toHaveProperty('valid_votes');
      expect(result).toHaveProperty('quorum_required');
      expect(result).toHaveProperty('quorum_reached');
      expect(result).toHaveProperty('majority_type');
      expect(result).toHaveProperty('ties_detected');
    });

    it('should always set ties_detected to false', () => {
      const votes = [
        { listnum: 1, votes: 500 },
        { listnum: 2, votes: 500 }, // Equal votes
      ];

      const result = countReferendum({
        votes,
        config: { quorum: 0, majority_type: 'simple' },
      });

      // Referendums don't have ties (50-50 = REJECTED)
      expect(result.ties_detected).toBe(false);
    });
  });

  describe('BSI Compliance - Deterministic Results', () => {
    it('should produce identical results for same input', () => {
      const votes = [
        { listnum: 1, votes: 600 },
        { listnum: 2, votes: 400 },
        { listnum: 3, votes: 100 },
      ];

      const result1 = countReferendum({
        votes: JSON.parse(JSON.stringify(votes)),
        config: { quorum: 500, majority_type: 'simple' },
      });

      const result2 = countReferendum({
        votes: JSON.parse(JSON.stringify(votes)),
        config: { quorum: 500, majority_type: 'simple' },
      });

      expect(result1).toEqual(result2);
    });
  });

  describe('Percentage Calculation Precision', () => {
    it('should calculate percentages with 2 decimal places', () => {
      const votes = [
        { listnum: 1, votes: 333 }, // YES
        { listnum: 2, votes: 667 }, // NO
      ];

      const result = countReferendum({
        votes,
        config: { quorum: 0, majority_type: 'simple' },
      });

      expect(result.yes_percentage).toBe('33.30'); // 333/1000
      expect(result.no_percentage).toBe('66.70'); // 667/1000
    });

    it('should handle floating-point precision correctly', () => {
      const votes = [
        { listnum: 1, votes: 1 }, // YES
        { listnum: 2, votes: 3 }, // NO
      ];

      const result = countReferendum({
        votes,
        config: { quorum: 0, majority_type: 'simple' },
      });

      expect(result.yes_percentage).toBe('25.00'); // 1/4
      expect(result.no_percentage).toBe('75.00'); // 3/4
    });
  });

  describe('Boundary Cases - Majority Thresholds', () => {
    it('should handle odd total votes for simple majority', () => {
      const votes = [
        { listnum: 1, votes: 501 }, // YES
        { listnum: 2, votes: 498 }, // NO
      ];

      const result = countReferendum({
        votes,
        config: { quorum: 0, majority_type: 'simple' },
      });

      // 501 > 499.5 (999/2) → ACCEPTED
      expect(result.result).toBe('ACCEPTED');
      expect(result.valid_votes).toBe(999);
    });

    it('should handle minimum winning margin (1 vote)', () => {
      const votes = [
        { listnum: 1, votes: 501 }, // YES
        { listnum: 2, votes: 500 }, // NO
      ];

      const result = countReferendum({
        votes,
        config: { quorum: 0, majority_type: 'simple' },
      });

      // 501 > 500.5 (1001/2) → ACCEPTED
      expect(result.result).toBe('ACCEPTED');
    });
  });
});
