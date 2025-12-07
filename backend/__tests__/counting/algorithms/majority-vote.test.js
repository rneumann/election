import { describe, it, expect } from 'vitest';
import { countMajorityVote } from '../../../src/counting/algorithms/majority-vote.js';

describe('Majority Vote Algorithm', () => {
  describe('Basic Functionality - Simple Majority', () => {
    it('should elect top N candidates by vote count', () => {
      const votes = [
        { listnum: 1, firstname: 'Alice', lastname: 'Müller', votes: 450 },
        { listnum: 2, firstname: 'Bob', lastname: 'Schmidt', votes: 380 },
        { listnum: 3, firstname: 'Charlie', lastname: 'Weber', votes: 320 },
        { listnum: 4, firstname: 'Diana', lastname: 'Fischer', votes: 250 },
      ];

      const result = countMajorityVote({
        votes,
        config: { seats_to_fill: 2, counting_method: 'highest_votes_simple' },
      });

      expect(result.algorithm).toBe('highest_votes_simple');
      expect(result.seats_allocated).toBe(2);
      expect(result.elected).toHaveLength(2);
      expect(result.elected[0].listnum).toBe(1); // Alice
      expect(result.elected[1].listnum).toBe(2); // Bob
      expect(result.ties_detected).toBe(false);
      expect(result.absolute_majority_required).toBe(false);
      // all_candidates assertions
      expect(result).toHaveProperty('all_candidates');
      expect(result.all_candidates).toHaveLength(votes.length);
      // Elected flags
      const electedFlags = result.all_candidates.filter((c) => c.is_elected);
      expect(electedFlags).toHaveLength(result.seats_allocated);
      // Tie flags should be false in this scenario
      expect(result.all_candidates.some((c) => c.is_tie)).toBe(false);
    });

    it('should calculate percentages correctly', () => {
      const votes = [
        { listnum: 1, firstname: 'Alice', lastname: 'Müller', votes: 500 },
        { listnum: 2, firstname: 'Bob', lastname: 'Schmidt', votes: 300 },
        { listnum: 3, firstname: 'Charlie', lastname: 'Weber', votes: 200 },
      ];

      const result = countMajorityVote({
        votes,
        config: { seats_to_fill: 2, counting_method: 'highest_votes_simple' },
      });

      expect(result.total_votes).toBe(1000);
      expect(result.elected[0].percentage).toBe('50.00');
      expect(result.elected[1].percentage).toBe('30.00');
    });

    it('should handle single seat election', () => {
      const votes = [
        { listnum: 1, firstname: 'Alice', lastname: 'Müller', votes: 450 },
        { listnum: 2, firstname: 'Bob', lastname: 'Schmidt', votes: 380 },
      ];

      const result = countMajorityVote({
        votes,
        config: { seats_to_fill: 1, counting_method: 'highest_votes_simple' },
      });

      expect(result.seats_allocated).toBe(1);
      expect(result.elected[0].listnum).toBe(1);
      expect(result.ties_detected).toBe(false);
    });
  });

  describe('Basic Functionality - Absolute Majority', () => {
    it('should detect absolute majority achieved (>50%)', () => {
      const votes = [
        { listnum: 1, firstname: 'Alice', lastname: 'Müller', votes: 550 },
        { listnum: 2, firstname: 'Bob', lastname: 'Schmidt', votes: 300 },
        { listnum: 3, firstname: 'Charlie', lastname: 'Weber', votes: 150 },
      ];

      const result = countMajorityVote({
        votes,
        config: { seats_to_fill: 1, counting_method: 'highest_votes_absolute' },
      });

      expect(result.algorithm).toBe('highest_votes_absolute');
      expect(result.absolute_majority_required).toBe(true);
      expect(result.absolute_majority_achieved).toBe(true);
      expect(result.absolute_majority_threshold).toBe(500); // 1000/2
      expect(result.elected[0].votes).toBe(550);
      expect(result.majority_info).toContain('Absolute majority achieved');
      expect(result.majority_info).toContain('55.00%');
    });

    it('should detect absolute majority NOT achieved (≤50%)', () => {
      const votes = [
        { listnum: 1, firstname: 'Alice', lastname: 'Müller', votes: 450 },
        { listnum: 2, firstname: 'Bob', lastname: 'Schmidt', votes: 350 },
        { listnum: 3, firstname: 'Charlie', lastname: 'Weber', votes: 200 },
      ];

      const result = countMajorityVote({
        votes,
        config: { seats_to_fill: 1, counting_method: 'highest_votes_absolute' },
      });

      expect(result.absolute_majority_achieved).toBe(false);
      expect(result.absolute_majority_threshold).toBe(500); // 1000/2
      expect(result.elected[0].votes).toBe(450); // 450 ≤ 500
      expect(result.majority_info).toContain('No absolute majority');
      expect(result.majority_info).toContain('Runoff election required');
    });

    it('should detect exact 50% as NO absolute majority', () => {
      const votes = [
        { listnum: 1, firstname: 'Alice', lastname: 'Müller', votes: 500 },
        { listnum: 2, firstname: 'Bob', lastname: 'Schmidt', votes: 500 },
      ];

      const result = countMajorityVote({
        votes,
        config: { seats_to_fill: 1, counting_method: 'highest_votes_absolute' },
      });

      // 500 is NOT > 500 (threshold = 1000/2 = 500)
      expect(result.absolute_majority_achieved).toBe(false);
      expect(result.majority_info).toContain('No absolute majority');
    });
  });

  describe('Tie Detection', () => {
    it('should detect tie at cutoff for simple majority', () => {
      const votes = [
        { listnum: 1, firstname: 'Alice', lastname: 'Müller', votes: 450 },
        { listnum: 2, firstname: 'Bob', lastname: 'Schmidt', votes: 350 },
        { listnum: 3, firstname: 'Charlie', lastname: 'Weber', votes: 350 }, // Tie with Bob
        { listnum: 4, firstname: 'Diana', lastname: 'Fischer', votes: 250 },
      ];

      const result = countMajorityVote({
        votes,
        config: { seats_to_fill: 2, counting_method: 'highest_votes_simple' },
      });

      expect(result.ties_detected).toBe(true);
      expect(result.resolution_required).toBe(true);
      expect(result.tie_candidates).toHaveLength(1);
      expect(result.tie_candidates[0].votes).toBe(350);
      expect(result.tie_info).toContain('Tie detected at 350 votes');
      expect(result.tie_info).toContain('Manual resolution');
      // all_candidates tie flags
      const tieMarked = result.all_candidates.filter((c) => c.is_tie);
      expect(tieMarked).toHaveLength(2);
      expect(tieMarked.map((c) => c.listnum).sort()).toEqual([2, 3]);
      // Elected + non-elected present
      expect(result.all_candidates).toHaveLength(votes.length);
    });

    it('should detect 3-way tie at cutoff', () => {
      const votes = [
        { listnum: 1, firstname: 'Alice', lastname: 'Müller', votes: 500 },
        { listnum: 2, firstname: 'Bob', lastname: 'Schmidt', votes: 300 },
        { listnum: 3, firstname: 'Charlie', lastname: 'Weber', votes: 300 }, // Tie
        { listnum: 4, firstname: 'Diana', lastname: 'Fischer', votes: 300 }, // Tie
      ];

      const result = countMajorityVote({
        votes,
        config: { seats_to_fill: 2, counting_method: 'highest_votes_simple' },
      });

      expect(result.ties_detected).toBe(true);
      expect(result.tie_candidates).toHaveLength(2); // 2 additional candidates with 300 votes
      expect(result.seats_allocated).toBe(2);
      const tieMarked = result.all_candidates.filter((c) => c.is_tie);
      expect(tieMarked.map((c) => c.listnum).sort()).toEqual([2, 3, 4]);
    });

    it('should NOT detect tie when cutoff candidate is unique', () => {
      const votes = [
        { listnum: 1, firstname: 'Alice', lastname: 'Müller', votes: 450 },
        { listnum: 2, firstname: 'Bob', lastname: 'Schmidt', votes: 350 },
        { listnum: 3, firstname: 'Charlie', lastname: 'Weber', votes: 300 }, // Different
      ];

      const result = countMajorityVote({
        votes,
        config: { seats_to_fill: 2, counting_method: 'highest_votes_simple' },
      });

      expect(result.ties_detected).toBe(false);
      expect(result.tie_candidates).toHaveLength(0);
      expect(result.tie_info).toBeNull();
    });

    it('should detect tie even with absolute majority method', () => {
      const votes = [
        { listnum: 1, firstname: 'Alice', lastname: 'Müller', votes: 600 }, // >50%
        { listnum: 2, firstname: 'Bob', lastname: 'Schmidt', votes: 200 },
        { listnum: 3, firstname: 'Charlie', lastname: 'Weber', votes: 200 }, // Tie
      ];

      const result = countMajorityVote({
        votes,
        config: { seats_to_fill: 2, counting_method: 'highest_votes_absolute' },
      });

      expect(result.absolute_majority_achieved).toBe(true); // Alice has >50%
      expect(result.ties_detected).toBe(true); // But Bob/Charlie tie
      expect(result.tie_candidates).toHaveLength(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle more seats than candidates', () => {
      const votes = [
        { listnum: 1, firstname: 'Alice', lastname: 'Müller', votes: 450 },
        { listnum: 2, firstname: 'Bob', lastname: 'Schmidt', votes: 350 },
      ];

      const result = countMajorityVote({
        votes,
        config: { seats_to_fill: 5, counting_method: 'highest_votes_simple' },
      });

      expect(result.seats_allocated).toBe(2); // Only 2 candidates available
      expect(result.elected).toHaveLength(2);
      expect(result.ties_detected).toBe(false);
      // all_candidates still lists both
      expect(result.all_candidates).toHaveLength(2);
    });

    it('should handle single candidate', () => {
      const votes = [{ listnum: 1, firstname: 'Alice', lastname: 'Müller', votes: 500 }];

      const result = countMajorityVote({
        votes,
        config: { seats_to_fill: 1, counting_method: 'highest_votes_simple' },
      });

      expect(result.seats_allocated).toBe(1);
      expect(result.elected[0].listnum).toBe(1);
    });

    it('should handle candidate with zero votes', () => {
      const votes = [
        { listnum: 1, firstname: 'Alice', lastname: 'Müller', votes: 450 },
        { listnum: 2, firstname: 'Bob', lastname: 'Schmidt', votes: 0 },
        { listnum: 3, firstname: 'Charlie', lastname: 'Weber', votes: 350 },
      ];

      const result = countMajorityVote({
        votes,
        config: { seats_to_fill: 2, counting_method: 'highest_votes_simple' },
      });

      expect(result.elected[0].listnum).toBe(1); // Alice
      expect(result.elected[1].listnum).toBe(3); // Charlie (Bob has 0)
      expect(result.all_candidates.find((c) => c.listnum === 2).percentage).toBe('0.00');
    });

    it('should handle all candidates with zero votes', () => {
      const votes = [
        { listnum: 1, firstname: 'Alice', lastname: 'Müller', votes: 0 },
        { listnum: 2, firstname: 'Bob', lastname: 'Schmidt', votes: 0 },
      ];

      const result = countMajorityVote({
        votes,
        config: { seats_to_fill: 1, counting_method: 'highest_votes_simple' },
      });

      expect(result.total_votes).toBe(0);
      expect(result.elected[0].percentage).toBe('0.00');
    });

    it('should handle all candidates tied at zero votes', () => {
      const votes = [
        { listnum: 1, firstname: 'Alice', lastname: 'Müller', votes: 0 },
        { listnum: 2, firstname: 'Bob', lastname: 'Schmidt', votes: 0 },
        { listnum: 3, firstname: 'Charlie', lastname: 'Weber', votes: 0 },
      ];

      const result = countMajorityVote({
        votes,
        config: { seats_to_fill: 2, counting_method: 'highest_votes_simple' },
      });

      // First 2 candidates elected (all tied at 0)
      expect(result.seats_allocated).toBe(2);
      expect(result.ties_detected).toBe(true);
      expect(result.tie_candidates).toHaveLength(1); // Charlie not elected
      // Tie flags: third candidate marked
      const tieMarked = result.all_candidates.filter((c) => c.is_tie);
      expect(tieMarked).toHaveLength(3);
      expect(tieMarked.map((c) => c.listnum).sort()).toEqual([1, 2, 3]);
    });
  });

  describe('Input Validation', () => {
    it('should reject invalid seats_to_fill (zero)', () => {
      const votes = [{ listnum: 1, firstname: 'Alice', lastname: 'Müller', votes: 100 }];

      expect(() =>
        countMajorityVote({
          votes,
          config: { seats_to_fill: 0, counting_method: 'highest_votes_simple' },
        }),
      ).toThrow('Invalid seats_to_fill');
    });

    it('should reject invalid seats_to_fill (negative)', () => {
      const votes = [{ listnum: 1, firstname: 'Alice', lastname: 'Müller', votes: 100 }];

      expect(() =>
        countMajorityVote({
          votes,
          config: { seats_to_fill: -1, counting_method: 'highest_votes_simple' },
        }),
      ).toThrow('Invalid seats_to_fill');
    });

    it('should reject invalid seats_to_fill (non-integer)', () => {
      const votes = [{ listnum: 1, firstname: 'Alice', lastname: 'Müller', votes: 100 }];

      expect(() =>
        countMajorityVote({
          votes,
          config: { seats_to_fill: 2.5, counting_method: 'highest_votes_simple' },
        }),
      ).toThrow('Invalid seats_to_fill');
    });

    it('should reject empty votes array', () => {
      expect(() =>
        countMajorityVote({
          votes: [],
          config: { seats_to_fill: 1, counting_method: 'highest_votes_simple' },
        }),
      ).toThrow('No candidates to count');
    });

    it('should reject non-array votes', () => {
      expect(() =>
        countMajorityVote({
          votes: 'not an array',
          config: { seats_to_fill: 1, counting_method: 'highest_votes_simple' },
        }),
      ).toThrow('votes must be an array');
    });

    it('should reject missing config', () => {
      const votes = [{ listnum: 1, firstname: 'Alice', lastname: 'Müller', votes: 100 }];

      expect(() => countMajorityVote({ votes, config: null })).toThrow('config must be an object');
    });
  });

  describe('Output Format', () => {
    it('should return all required fields for simple majority', () => {
      const votes = [
        { listnum: 1, firstname: 'Alice', lastname: 'Müller', votes: 450 },
        { listnum: 2, firstname: 'Bob', lastname: 'Schmidt', votes: 350 },
      ];

      const result = countMajorityVote({
        votes,
        config: { seats_to_fill: 1, counting_method: 'highest_votes_simple' },
      });

      expect(result).toHaveProperty('algorithm');
      expect(result).toHaveProperty('seats_to_fill');
      expect(result).toHaveProperty('seats_allocated');
      expect(result).toHaveProperty('elected');
      expect(result).toHaveProperty('total_votes');
      expect(result).toHaveProperty('ties_detected');
      expect(result).toHaveProperty('tie_candidates');
      expect(result).toHaveProperty('resolution_required');
      expect(result).toHaveProperty('tie_info');
      expect(result).toHaveProperty('absolute_majority_required');
      expect(result).toHaveProperty('absolute_majority_achieved');
      expect(result).toHaveProperty('majority_info');
      expect(result).toHaveProperty('all_candidates');
    });

    it('should include all candidate information in elected', () => {
      const votes = [
        { listnum: 1, firstname: 'Alice', lastname: 'Müller', votes: 450 },
        { listnum: 2, firstname: 'Bob', lastname: 'Schmidt', votes: 350 },
      ];

      const result = countMajorityVote({
        votes,
        config: { seats_to_fill: 1, counting_method: 'highest_votes_simple' },
      });

      const elected = result.elected[0];
      expect(elected).toHaveProperty('listnum');
      expect(elected).toHaveProperty('candidate');
      expect(elected).toHaveProperty('firstname');
      expect(elected).toHaveProperty('lastname');
      expect(elected).toHaveProperty('votes');
      expect(elected).toHaveProperty('percentage');
      expect(elected.candidate).toBe('Alice Müller');
    });
  });

  describe('Absolute Majority Threshold Calculation', () => {
    it('should calculate threshold correctly for odd total votes', () => {
      const votes = [
        { listnum: 1, firstname: 'Alice', lastname: 'Müller', votes: 501 },
        { listnum: 2, firstname: 'Bob', lastname: 'Schmidt', votes: 498 },
      ];

      const result = countMajorityVote({
        votes,
        config: { seats_to_fill: 1, counting_method: 'highest_votes_absolute' },
      });

      expect(result.total_votes).toBe(999);
      expect(result.absolute_majority_threshold).toBe(499.5); // 999/2
      expect(result.absolute_majority_achieved).toBe(true); // 501 > 499.5
    });

    it('should calculate threshold correctly for even total votes', () => {
      const votes = [
        { listnum: 1, firstname: 'Alice', lastname: 'Müller', votes: 501 },
        { listnum: 2, firstname: 'Bob', lastname: 'Schmidt', votes: 499 },
      ];

      const result = countMajorityVote({
        votes,
        config: { seats_to_fill: 1, counting_method: 'highest_votes_absolute' },
      });

      expect(result.total_votes).toBe(1000);
      expect(result.absolute_majority_threshold).toBe(500); // 1000/2
      expect(result.absolute_majority_achieved).toBe(true); // 501 > 500
    });
  });

  describe('BSI Compliance - Deterministic Results', () => {
    it('should produce identical results for same input', () => {
      const votes = [
        { listnum: 1, firstname: 'Alice', lastname: 'Müller', votes: 450 },
        { listnum: 2, firstname: 'Bob', lastname: 'Schmidt', votes: 350 },
        { listnum: 3, firstname: 'Charlie', lastname: 'Weber', votes: 300 },
      ];

      const result1 = countMajorityVote({
        votes: JSON.parse(JSON.stringify(votes)),
        config: { seats_to_fill: 2, counting_method: 'highest_votes_simple' },
      });

      const result2 = countMajorityVote({
        votes: JSON.parse(JSON.stringify(votes)),
        config: { seats_to_fill: 2, counting_method: 'highest_votes_simple' },
      });

      expect(result1.elected).toEqual(result2.elected);
      expect(result1.ties_detected).toBe(result2.ties_detected);
      expect(result1.total_votes).toBe(result2.total_votes);
    });
  });
});
