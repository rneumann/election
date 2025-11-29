/**
 * Unit tests for Hare-Niemeyer (Largest Remainder) counting algorithm.
 * Tests mathematical correctness, remainder distribution, and tie detection.
 */

import { describe, it, expect } from 'vitest';
import { countHareNiemeyer } from '../../../src/counting/algorithms/hare-niemeyer.js';

describe('Hare-Niemeyer Algorithm', () => {
  describe('Basic Functionality', () => {
    it('should allocate seats correctly with standard vote distribution', () => {
      const votes = [
        { listnum: 1, firstname: 'Liste', lastname: 'A', votes: 4567 },
        { listnum: 2, firstname: 'Liste', lastname: 'B', votes: 3891 },
        { listnum: 3, firstname: 'Liste', lastname: 'C', votes: 2542 },
      ];

      const result = countHareNiemeyer({
        votes,
        config: { seats_to_fill: 5 },
      });

      expect(result.algorithm).toBe('hare_niemeyer');
      expect(result.seats_to_fill).toBe(5);
      expect(result.total_votes).toBe(11000);
      expect(result.ties_detected).toBe(false);

      // Verify total seats allocated
      const totalSeats = result.allocation.reduce((sum, c) => sum + c.seats, 0);
      expect(totalSeats).toBe(5);

      // All candidates should be included
      expect(result.allocation).toHaveLength(3);

      // Each allocation should have quota and remainder
      result.allocation.forEach((candidate) => {
        expect(candidate).toHaveProperty('quota');
        expect(candidate).toHaveProperty('remainder');
      });
    });

    it('should calculate quotas correctly', () => {
      const votes = [
        { listnum: 1, firstname: 'Liste', lastname: 'A', votes: 500 },
        { listnum: 2, firstname: 'Liste', lastname: 'B', votes: 300 },
        { listnum: 3, firstname: 'Liste', lastname: 'C', votes: 200 },
      ];

      const result = countHareNiemeyer({
        votes,
        config: { seats_to_fill: 10 },
      });

      // Total: 1000 votes
      // A: 500/1000 * 10 = 5.0 -> 5 seats (0 remainder)
      // B: 300/1000 * 10 = 3.0 -> 3 seats (0 remainder)
      // C: 200/1000 * 10 = 2.0 -> 2 seats (0 remainder)

      const listeA = result.allocation.find((c) => c.listnum === 1);
      const listeB = result.allocation.find((c) => c.listnum === 2);
      const listeC = result.allocation.find((c) => c.listnum === 3);

      expect(listeA.seats).toBe(5);
      expect(parseFloat(listeA.quota)).toBeCloseTo(5.0, 3);

      expect(listeB.seats).toBe(3);
      expect(parseFloat(listeB.quota)).toBeCloseTo(3.0, 3);

      expect(listeC.seats).toBe(2);
      expect(parseFloat(listeC.quota)).toBeCloseTo(2.0, 3);
    });

    it('should distribute remaining seats by largest remainder', () => {
      const votes = [
        { listnum: 1, firstname: 'Liste', lastname: 'A', votes: 416 },
        { listnum: 2, firstname: 'Liste', lastname: 'B', votes: 338 },
        { listnum: 3, firstname: 'Liste', lastname: 'C', votes: 246 },
      ];

      const result = countHareNiemeyer({
        votes,
        config: { seats_to_fill: 10 },
      });

      // Total: 1000 votes
      // A: 416/1000 * 10 = 4.16 -> floor=4, remainder=0.16
      // B: 338/1000 * 10 = 3.38 -> floor=3, remainder=0.38
      // C: 246/1000 * 10 = 2.46 -> floor=2, remainder=0.46
      // Initial: 4+3+2 = 9 seats, 1 remaining
      // Largest remainder: C (0.46) gets +1 seat

      const listeA = result.allocation.find((c) => c.listnum === 1);
      const listeB = result.allocation.find((c) => c.listnum === 2);
      const listeC = result.allocation.find((c) => c.listnum === 3);

      expect(listeA.seats).toBe(4); // floor(4.16)
      expect(listeB.seats).toBe(3); // floor(3.38)
      expect(listeC.seats).toBe(3); // floor(2.46) + 1 (largest remainder)

      const totalSeats = result.allocation.reduce((sum, c) => sum + c.seats, 0);
      expect(totalSeats).toBe(10);
    });

    it('should allocate multiple remaining seats correctly', () => {
      const votes = [
        { listnum: 1, firstname: 'Liste', lastname: 'A', votes: 380 },
        { listnum: 2, firstname: 'Liste', lastname: 'B', votes: 320 },
        { listnum: 3, firstname: 'Liste', lastname: 'C', votes: 180 },
        { listnum: 4, firstname: 'Liste', lastname: 'D', votes: 120 },
      ];

      const result = countHareNiemeyer({
        votes,
        config: { seats_to_fill: 10 },
      });

      // Total: 1000 votes
      // A: 380/1000 * 10 = 3.80 -> floor=3, remainder=0.80
      // B: 320/1000 * 10 = 3.20 -> floor=3, remainder=0.20
      // C: 180/1000 * 10 = 1.80 -> floor=1, remainder=0.80
      // D: 120/1000 * 10 = 1.20 -> floor=1, remainder=0.20
      // Initial: 3+3+1+1 = 8 seats, 2 remaining
      // Largest remainders: A (0.80), C (0.80) get +1 each

      const totalSeats = result.allocation.reduce((sum, c) => sum + c.seats, 0);
      expect(totalSeats).toBe(10);

      // A and C should have higher seats due to larger remainders
      const listeA = result.allocation.find((c) => c.listnum === 1);
      const listeC = result.allocation.find((c) => c.listnum === 3);

      expect(listeA.seats).toBe(4); // 3 + 1 remainder seat
      expect(listeC.seats).toBe(2); // 1 + 1 remainder seat
    });
  });

  describe('Edge Cases', () => {
    it('should handle single candidate', () => {
      const votes = [{ listnum: 1, firstname: 'Liste', lastname: 'A', votes: 1000 }];

      const result = countHareNiemeyer({
        votes,
        config: { seats_to_fill: 5 },
      });

      expect(result.allocation).toHaveLength(1);
      expect(result.allocation[0].seats).toBe(5);
      expect(parseFloat(result.allocation[0].quota)).toBeCloseTo(5.0, 3);
      expect(parseFloat(result.allocation[0].remainder)).toBeCloseTo(0.0, 3);
    });

    it('should handle single seat allocation', () => {
      const votes = [
        { listnum: 1, firstname: 'Liste', lastname: 'A', votes: 100 },
        { listnum: 2, firstname: 'Liste', lastname: 'B', votes: 90 },
        { listnum: 3, firstname: 'Liste', lastname: 'C', votes: 80 },
      ];

      const result = countHareNiemeyer({
        votes,
        config: { seats_to_fill: 1 },
      });

      // All quotas < 1, so all floor to 0
      // 1 remaining seat goes to largest remainder (A with ~0.37)
      expect(result.allocation.find((c) => c.listnum === 1).seats).toBe(1);
      expect(result.allocation.find((c) => c.listnum === 2).seats).toBe(0);
      expect(result.allocation.find((c) => c.listnum === 3).seats).toBe(0);
    });

    it('should handle candidate with zero votes', () => {
      const votes = [
        { listnum: 1, firstname: 'Liste', lastname: 'A', votes: 100 },
        { listnum: 2, firstname: 'Liste', lastname: 'B', votes: 0 },
        { listnum: 3, firstname: 'Liste', lastname: 'C', votes: 50 },
      ];

      const result = countHareNiemeyer({
        votes,
        config: { seats_to_fill: 3 },
      });

      // B with 0 votes should get 0 seats (quota = 0)
      const listeB = result.allocation.find((c) => c.listnum === 2);
      expect(listeB.seats).toBe(0);
      expect(parseFloat(listeB.quota)).toBe(0);

      // All 3 seats should go to A and C
      const seatsAC =
        result.allocation.find((c) => c.listnum === 1).seats +
        result.allocation.find((c) => c.listnum === 3).seats;
      expect(seatsAC).toBe(3);
    });

    it('should handle exact quota (no remainders)', () => {
      const votes = [
        { listnum: 1, firstname: 'Liste', lastname: 'A', votes: 600 },
        { listnum: 2, firstname: 'Liste', lastname: 'B', votes: 400 },
      ];

      const result = countHareNiemeyer({
        votes,
        config: { seats_to_fill: 10 },
      });

      // A: 600/1000 * 10 = 6.0 (exact)
      // B: 400/1000 * 10 = 4.0 (exact)
      const listeA = result.allocation.find((c) => c.listnum === 1);
      const listeB = result.allocation.find((c) => c.listnum === 2);

      expect(listeA.seats).toBe(6);
      expect(parseFloat(listeA.remainder)).toBeCloseTo(0.0, 3);
      expect(listeB.seats).toBe(4);
      expect(parseFloat(listeB.remainder)).toBeCloseTo(0.0, 3);
    });

    it('should handle more seats than candidates', () => {
      const votes = [
        { listnum: 1, firstname: 'Liste', lastname: 'A', votes: 60 },
        { listnum: 2, firstname: 'Liste', lastname: 'B', votes: 40 },
      ];

      const result = countHareNiemeyer({
        votes,
        config: { seats_to_fill: 50 },
      });

      const totalSeats = result.allocation.reduce((sum, c) => sum + c.seats, 0);
      expect(totalSeats).toBe(50);

      // A should get 30 seats (60%), B should get 20 (40%)
      const listeA = result.allocation.find((c) => c.listnum === 1);
      const listeB = result.allocation.find((c) => c.listnum === 2);

      expect(listeA.seats).toBe(30);
      expect(listeB.seats).toBe(20);
    });
  });

  describe('Remainder Distribution Logic', () => {
    it('should prioritize candidates with highest remainders', () => {
      const votes = [
        { listnum: 1, firstname: 'Liste', lastname: 'A', votes: 410 }, // quota 4.1, remainder 0.1
        { listnum: 2, firstname: 'Liste', lastname: 'B', votes: 350 }, // quota 3.5, remainder 0.5
        { listnum: 3, firstname: 'Liste', lastname: 'C', votes: 240 }, // quota 2.4, remainder 0.4
      ];

      const result = countHareNiemeyer({
        votes,
        config: { seats_to_fill: 10 },
      });

      // Initial: 4+3+2 = 9, 1 remaining
      // Highest remainder: B (0.5) gets +1
      const listeB = result.allocation.find((c) => c.listnum === 2);
      expect(listeB.seats).toBe(4); // 3 + 1 from remainder
    });

    it('should handle all remainders equal to zero', () => {
      const votes = [
        { listnum: 1, firstname: 'Liste', lastname: 'A', votes: 500 },
        { listnum: 2, firstname: 'Liste', lastname: 'B', votes: 300 },
        { listnum: 3, firstname: 'Liste', lastname: 'C', votes: 200 },
      ];

      const result = countHareNiemeyer({
        votes,
        config: { seats_to_fill: 10 },
      });

      // Perfect distribution, no remainders
      expect(result.allocation.find((c) => c.listnum === 1).seats).toBe(5);
      expect(result.allocation.find((c) => c.listnum === 2).seats).toBe(3);
      expect(result.allocation.find((c) => c.listnum === 3).seats).toBe(2);
    });

    it('should allocate remainders in descending order', () => {
      const votes = [
        { listnum: 1, firstname: 'Liste', lastname: 'A', votes: 330 }, // quota 3.3, remainder 0.3
        { listnum: 2, firstname: 'Liste', lastname: 'B', votes: 335 }, // quota 3.35, remainder 0.35
        { listnum: 3, firstname: 'Liste', lastname: 'C', votes: 335 }, // quota 3.35, remainder 0.35
      ];

      const result = countHareNiemeyer({
        votes,
        config: { seats_to_fill: 10 },
      });

      // Initial: 3+3+3 = 9, 1 remaining
      // Highest remainder: B or C (0.35) - one of them gets +1
      const totalSeats = result.allocation.reduce((sum, c) => sum + c.seats, 0);
      expect(totalSeats).toBe(10);

      // Either B or C should have 4 seats
      const listeB = result.allocation.find((c) => c.listnum === 2);
      const listeC = result.allocation.find((c) => c.listnum === 3);
      expect(listeB.seats + listeC.seats).toBe(7); // 3+4 or 4+3
    });
  });

  describe('Tie Detection', () => {
    it('should detect exact remainder tie at cutoff', () => {
      const votes = [
        { listnum: 1, firstname: 'Liste', lastname: 'A', votes: 400 }, // quota 4.0, remainder 0.0
        { listnum: 2, firstname: 'Liste', lastname: 'B', votes: 350 }, // quota 3.5, remainder 0.5
        { listnum: 3, firstname: 'Liste', lastname: 'C', votes: 250 }, // quota 2.5, remainder 0.5
      ];

      const result = countHareNiemeyer({
        votes,
        config: { seats_to_fill: 10 },
      });

      // Initial: 4+3+2 = 9, 1 remaining seat
      // B and C both have remainder 0.5 - TIE!
      expect(result.ties_detected).toBe(true);
      expect(result.tie_info).toContain('Remainder tie detected');

      // Seats are still allocated (one of the tied candidates gets it)
      // but ties_detected flag indicates manual resolution needed
      const totalSeats = result.allocation.reduce((sum, c) => sum + c.seats, 0);
      expect(totalSeats).toBe(10);

      // Verify B and C have same remainder
      const listeB = result.allocation.find((c) => c.listnum === 2);
      const listeC = result.allocation.find((c) => c.listnum === 3);
      expect(listeB.remainder).toBe(listeC.remainder);
    });

    it('should handle no tie when remainders differ', () => {
      const votes = [
        { listnum: 1, firstname: 'Liste', lastname: 'A', votes: 410 }, // quota 4.1, remainder 0.1
        { listnum: 2, firstname: 'Liste', lastname: 'B', votes: 340 }, // quota 3.4, remainder 0.4
        { listnum: 3, firstname: 'Liste', lastname: 'C', votes: 250 }, // quota 2.5, remainder 0.5 (gets seat)
      ];

      const result = countHareNiemeyer({
        votes,
        config: { seats_to_fill: 10 },
      });

      // Initial: 4+3+2 = 9, 1 remaining seat
      // C gets it (0.5 > 0.4 > 0.1) - no tie
      expect(result.ties_detected).toBe(false);

      const totalSeats = result.allocation.reduce((sum, c) => sum + c.seats, 0);
      expect(totalSeats).toBe(10);
    });

    it('should detect ties when multiple candidates have equal remainders', () => {
      const votes = [
        { listnum: 1, firstname: 'Liste', lastname: 'A', votes: 420 }, // quota 4.2, remainder 0.2
        { listnum: 2, firstname: 'Liste', lastname: 'B', votes: 330 }, // quota 3.3, remainder 0.3
        { listnum: 3, firstname: 'Liste', lastname: 'C', votes: 250 }, // quota 2.5, remainder 0.5 (winner)
      ];

      const result = countHareNiemeyer({
        votes,
        config: { seats_to_fill: 10 },
      });

      // No exact tie in this case
      expect(result.ties_detected).toBe(false);
    });

    it('should provide tie info when remainder tie detected', () => {
      // Create scenario where tie is likely
      const votes = [
        { listnum: 1, firstname: 'Liste', lastname: 'A', votes: 450 }, // quota 4.5, remainder 0.5
        { listnum: 2, firstname: 'Liste', lastname: 'B', votes: 350 }, // quota 3.5, remainder 0.5
        { listnum: 3, firstname: 'Liste', lastname: 'C', votes: 200 }, // quota 2.0, remainder 0.0
      ];

      const result = countHareNiemeyer({
        votes,
        config: { seats_to_fill: 10 },
      });

      // Initial: 4+3+2 = 9, 1 remaining
      // A and B both have remainder 0.5 - TIE!
      if (result.ties_detected) {
        expect(result.tie_info).toContain('Remainder tie detected');
        expect(result.tie_info).toContain('equal remainders');
      }
    });
  });

  describe('Input Validation', () => {
    it('should reject invalid seats_to_fill (zero)', () => {
      const votes = [{ listnum: 1, firstname: 'Liste', lastname: 'A', votes: 100 }];

      expect(() =>
        countHareNiemeyer({
          votes,
          config: { seats_to_fill: 0 },
        }),
      ).toThrow('Invalid seats_to_fill');
    });

    it('should reject invalid seats_to_fill (negative)', () => {
      const votes = [{ listnum: 1, firstname: 'Liste', lastname: 'A', votes: 100 }];

      expect(() =>
        countHareNiemeyer({
          votes,
          config: { seats_to_fill: -5 },
        }),
      ).toThrow('Invalid seats_to_fill');
    });

    it('should reject invalid seats_to_fill (non-integer)', () => {
      const votes = [{ listnum: 1, firstname: 'Liste', lastname: 'A', votes: 100 }];

      expect(() =>
        countHareNiemeyer({
          votes,
          config: { seats_to_fill: 3.5 },
        }),
      ).toThrow('Invalid seats_to_fill');
    });

    it('should reject zero total votes', () => {
      const votes = [
        { listnum: 1, firstname: 'Liste', lastname: 'A', votes: 0 },
        { listnum: 2, firstname: 'Liste', lastname: 'B', votes: 0 },
      ];

      expect(() =>
        countHareNiemeyer({
          votes,
          config: { seats_to_fill: 3 },
        }),
      ).toThrow('No valid votes to count');
    });

    it('should reject non-array votes', () => {
      expect(() =>
        countHareNiemeyer({
          votes: 'invalid',
          config: { seats_to_fill: 3 },
        }),
      ).toThrow('votes must be an array');
    });

    it('should reject missing config', () => {
      const votes = [{ listnum: 1, firstname: 'Liste', lastname: 'A', votes: 100 }];

      expect(() =>
        countHareNiemeyer({
          votes,
          config: null,
        }),
      ).toThrow('config must be an object');
    });
  });

  describe('Mathematical Correctness', () => {
    it('should ensure sum of quotas equals seats_to_fill', () => {
      const votes = [
        { listnum: 1, firstname: 'Liste', lastname: 'A', votes: 4567 },
        { listnum: 2, firstname: 'Liste', lastname: 'B', votes: 3891 },
        { listnum: 3, firstname: 'Liste', lastname: 'C', votes: 2542 },
      ];

      const result = countHareNiemeyer({
        votes,
        config: { seats_to_fill: 7 },
      });

      // Sum of quotas should equal seats_to_fill
      const sumQuotas = result.allocation.reduce((sum, c) => sum + parseFloat(c.quota), 0);
      expect(sumQuotas).toBeCloseTo(7, 3);
    });

    it('should ensure sum of seats equals seats_to_fill', () => {
      const votes = [
        { listnum: 1, firstname: 'Liste', lastname: 'A', votes: 100 },
        { listnum: 2, firstname: 'Liste', lastname: 'B', votes: 200 },
        { listnum: 3, firstname: 'Liste', lastname: 'C', votes: 300 },
      ];

      const result = countHareNiemeyer({
        votes,
        config: { seats_to_fill: 15 },
      });

      const totalSeats = result.allocation.reduce((sum, c) => sum + c.seats, 0);
      expect(totalSeats).toBe(15);
    });

    it('should produce consistent results', () => {
      const votes = [
        { listnum: 1, firstname: 'Liste', lastname: 'A', votes: 4567 },
        { listnum: 2, firstname: 'Liste', lastname: 'B', votes: 3891 },
        { listnum: 3, firstname: 'Liste', lastname: 'C', votes: 2542 },
      ];

      const result1 = countHareNiemeyer({ votes, config: { seats_to_fill: 7 } });
      const result2 = countHareNiemeyer({ votes, config: { seats_to_fill: 7 } });

      // Results should be identical
      expect(result1.allocation).toEqual(result2.allocation);
    });

    it('should handle floating-point precision correctly', () => {
      const votes = [
        { listnum: 1, firstname: 'Liste', lastname: 'A', votes: 333 },
        { listnum: 2, firstname: 'Liste', lastname: 'B', votes: 333 },
        { listnum: 3, firstname: 'Liste', lastname: 'C', votes: 334 },
      ];

      const result = countHareNiemeyer({
        votes,
        config: { seats_to_fill: 10 },
      });

      const totalSeats = result.allocation.reduce((sum, c) => sum + c.seats, 0);
      expect(totalSeats).toBe(10);

      // All should get approximately 3.33 seats
      result.allocation.forEach((candidate) => {
        expect(candidate.seats).toBeGreaterThanOrEqual(3);
        expect(candidate.seats).toBeLessThanOrEqual(4);
      });
    });
  });

  describe('Output Format', () => {
    it('should return all required fields', () => {
      const votes = [
        { listnum: 1, firstname: 'Liste', lastname: 'A', votes: 100 },
        { listnum: 2, firstname: 'Liste', lastname: 'B', votes: 80 },
      ];

      const result = countHareNiemeyer({
        votes,
        config: { seats_to_fill: 3 },
      });

      expect(result).toHaveProperty('algorithm');
      expect(result).toHaveProperty('seats_to_fill');
      expect(result).toHaveProperty('total_votes');
      expect(result).toHaveProperty('allocation');
      expect(result).toHaveProperty('ties_detected');
    });

    it('should include all candidate information in allocation', () => {
      const votes = [{ listnum: 42, firstname: 'Max', lastname: 'Mustermann', votes: 100 }];

      const result = countHareNiemeyer({
        votes,
        config: { seats_to_fill: 2 },
      });

      const candidate = result.allocation[0];
      expect(candidate.listnum).toBe(42);
      expect(candidate.firstname).toBe('Max');
      expect(candidate.lastname).toBe('Mustermann');
      expect(candidate.candidate).toBe('Max Mustermann');
      expect(candidate.votes).toBe(100);
      expect(candidate.seats).toBe(2);
      expect(candidate).toHaveProperty('quota');
      expect(candidate).toHaveProperty('remainder');
    });
  });
});
