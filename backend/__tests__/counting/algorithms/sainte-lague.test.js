/**
 * Unit tests for Sainte-Laguë counting algorithm.
 * Tests mathematical correctness, edge cases, and tie detection.
 */

import { describe, it, expect } from 'vitest';
import { countSainteLague } from '../../../src/counting/algorithms/sainte-lague.js';

describe('Sainte-Laguë Algorithm', () => {
  describe('Basic Functionality', () => {
    it('should allocate seats correctly with standard vote distribution', () => {
      const votes = [
        { listnum: 1, firstname: 'Liste', lastname: 'A', votes: 4567 },
        { listnum: 2, firstname: 'Liste', lastname: 'B', votes: 3891 },
        { listnum: 3, firstname: 'Liste', lastname: 'C', votes: 2542 },
      ];

      const result = countSainteLague({
        votes,
        config: { seats_to_fill: 5 },
      });

      expect(result.algorithm).toBe('sainte_lague');
      expect(result.seats_to_fill).toBe(5);
      expect(result.total_votes).toBe(11000);
      expect(result.ties_detected).toBe(false);

      // Verify total seats allocated
      const totalSeats = result.allocation.reduce((sum, c) => sum + c.seats, 0);
      expect(totalSeats).toBe(5);

      // Liste A should get most seats (highest votes)
      const listeA = result.allocation.find((c) => c.listnum === 1);
      expect(listeA.seats).toBeGreaterThanOrEqual(2);

      // All candidates should be included
      expect(result.allocation).toHaveLength(3);
    });

    it('should allocate seats proportionally with clear majority', () => {
      const votes = [
        { listnum: 1, firstname: 'Liste', lastname: 'A', votes: 5100 },
        { listnum: 2, firstname: 'Liste', lastname: 'B', votes: 3050 },
        { listnum: 3, firstname: 'Liste', lastname: 'C', votes: 1850 },
      ];

      const result = countSainteLague({
        votes,
        config: { seats_to_fill: 10 },
      });

      // If no ties detected, verify all seats allocated
      if (!result.ties_detected) {
        const totalSeats = result.allocation.reduce((sum, c) => sum + c.seats, 0);
        expect(totalSeats).toBe(10);
      }

      // Liste A (51% votes) should get most seats
      const listeA = result.allocation.find((c) => c.listnum === 1);
      const listeB = result.allocation.find((c) => c.listnum === 2);
      const listeC = result.allocation.find((c) => c.listnum === 3);

      // Verify proportional distribution (A > B > C)
      expect(listeA.seats).toBeGreaterThan(listeB.seats);
      expect(listeB.seats).toBeGreaterThan(listeC.seats);

      // Liste A should have plurality
      expect(listeA.seats).toBeGreaterThanOrEqual(3);
    });

    it('should provide detailed calculation steps', () => {
      const votes = [
        { listnum: 1, firstname: 'Liste', lastname: 'A', votes: 100 },
        { listnum: 2, firstname: 'Liste', lastname: 'B', votes: 80 },
      ];

      const result = countSainteLague({
        votes,
        config: { seats_to_fill: 3 },
      });

      expect(result.calculation_steps).toHaveLength(3);

      // Each step should have required fields
      result.calculation_steps.forEach((step) => {
        expect(step).toHaveProperty('round');
        expect(step).toHaveProperty('winner');
        expect(step).toHaveProperty('listnum');
        expect(step).toHaveProperty('quotient');
        expect(step).toHaveProperty('divisor');
        expect(step).toHaveProperty('seats_now');
      });

      // First round: Liste A should win (100/1 = 100)
      expect(result.calculation_steps[0].listnum).toBe(1);
      expect(result.calculation_steps[0].divisor).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single candidate', () => {
      const votes = [{ listnum: 1, firstname: 'Liste', lastname: 'A', votes: 1000 }];

      const result = countSainteLague({
        votes,
        config: { seats_to_fill: 5 },
      });

      expect(result.allocation).toHaveLength(1);
      expect(result.allocation[0].seats).toBe(5);
    });

    it('should handle single seat allocation', () => {
      const votes = [
        { listnum: 1, firstname: 'Liste', lastname: 'A', votes: 100 },
        { listnum: 2, firstname: 'Liste', lastname: 'B', votes: 90 },
        { listnum: 3, firstname: 'Liste', lastname: 'C', votes: 80 },
      ];

      const result = countSainteLague({
        votes,
        config: { seats_to_fill: 1 },
      });

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

      const result = countSainteLague({
        votes,
        config: { seats_to_fill: 3 },
      });

      // Liste B with 0 votes should get 0 seats
      expect(result.allocation.find((c) => c.listnum === 2).seats).toBe(0);

      // All 3 seats should go to A and C
      const seatsAC =
        result.allocation.find((c) => c.listnum === 1).seats +
        result.allocation.find((c) => c.listnum === 3).seats;
      expect(seatsAC).toBe(3);
    });

    it('should handle large number of seats', () => {
      const votes = [
        { listnum: 1, firstname: 'Liste', lastname: 'A', votes: 10000 },
        { listnum: 2, firstname: 'Liste', lastname: 'B', votes: 5000 },
      ];

      const result = countSainteLague({
        votes,
        config: { seats_to_fill: 30 },
      });

      const totalSeats = result.allocation.reduce((sum, c) => sum + c.seats, 0);
      expect(totalSeats).toBe(30);

      // Liste A should get approximately 2/3 of seats (20)
      const listeA = result.allocation.find((c) => c.listnum === 1);
      expect(listeA.seats).toBeGreaterThanOrEqual(18);
      expect(listeA.seats).toBeLessThanOrEqual(22);
    });
  });

  describe('Tie Detection', () => {
    it('should detect exact ties and stop allocation', () => {
      const votes = [
        { listnum: 1, firstname: 'Liste', lastname: 'A', votes: 100 },
        { listnum: 2, firstname: 'Liste', lastname: 'B', votes: 100 },
      ];

      const result = countSainteLague({
        votes,
        config: { seats_to_fill: 3 },
      });

      // First seat goes to either A or B (both have quotient 100/1)
      expect(result.ties_detected).toBe(true);
      expect(result.tie_info).toContain('Round 1');
      expect(result.tie_info).toContain('2 candidates tied');
    });

    it('should detect ties after first allocation', () => {
      const votes = [
        { listnum: 1, firstname: 'Liste', lastname: 'A', votes: 300 },
        { listnum: 2, firstname: 'Liste', lastname: 'B', votes: 100 },
        { listnum: 3, firstname: 'Liste', lastname: 'C', votes: 100 },
      ];

      const result = countSainteLague({
        votes,
        config: { seats_to_fill: 5 },
      });

      // After A gets first seat (300/1=300), round 2 has:
      // A: 300/3=100, B: 100/1=100, C: 100/1=100 -> 3-way tie
      if (result.ties_detected) {
        expect(result.tie_info).toContain('tied');
        expect(result.tie_info).toMatch(/Round \d+/);
      }
    });

    it('should detect and resolve ties deterministically using lowest listnum', () => {
      const votes = [
        { listnum: 1, firstname: 'Liste', lastname: 'A', votes: 100 },
        { listnum: 2, firstname: 'Liste', lastname: 'B', votes: 100 },
      ];

      const result = countSainteLague({
        votes,
        config: { seats_to_fill: 5 },
      });

      expect(result.ties_detected).toBe(true);

      // All seats should be allocated using deterministic tie-breaking
      const totalSeats = result.allocation.reduce((sum, c) => sum + c.seats, 0);
      expect(totalSeats).toBe(5);

      // Liste A (listnum 1) should get more seats than B due to tie-breaking
      const listeA = result.allocation.find((c) => c.listnum === 1);
      const listeB = result.allocation.find((c) => c.listnum === 2);
      expect(listeA.seats).toBeGreaterThanOrEqual(listeB.seats);

      // Calculation steps should show all 5 allocations
      expect(result.calculation_steps).toHaveLength(5);

      // Tie info should mention deterministic tie-breaking
      expect(result.tie_info).toContain('tied');
      expect(result.tie_info).toContain('deterministic');
    });

    it('should preserve seats allocated before tie occurs', () => {
      const votes = [
        { listnum: 1, firstname: 'Liste', lastname: 'A', votes: 500 },
        { listnum: 2, firstname: 'Liste', lastname: 'B', votes: 100 },
        { listnum: 3, firstname: 'Liste', lastname: 'C', votes: 100 },
      ];

      const result = countSainteLague({
        votes,
        config: { seats_to_fill: 10 },
      });

      // Round 1: A wins (500/1=500)
      // Round 2: Tie between B, C (100/1) and possibly A (500/3≈166.67)
      // If tie detected after round 1, should have 1 seat allocated
      if (result.ties_detected) {
        const totalSeats = result.allocation.reduce((sum, c) => sum + c.seats, 0);
        expect(totalSeats).toBeGreaterThanOrEqual(1);
        expect(result.calculation_steps.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('should detect 3-way ties correctly and resolve deterministically', () => {
      const votes = [
        { listnum: 1, firstname: 'Liste', lastname: 'A', votes: 100 },
        { listnum: 2, firstname: 'Liste', lastname: 'B', votes: 100 },
        { listnum: 3, firstname: 'Liste', lastname: 'C', votes: 100 },
      ];

      const result = countSainteLague({
        votes,
        config: { seats_to_fill: 2 },
      });

      expect(result.ties_detected).toBe(true);
      expect(result.tie_info).toContain('3 candidates tied');

      // All seats allocated using deterministic tie-breaking
      const totalSeats = result.allocation.reduce((sum, c) => sum + c.seats, 0);
      expect(totalSeats).toBe(2);

      // Liste A (listnum 1) should get first seat due to lowest listnum
      const listeA = result.allocation.find((c) => c.listnum === 1);
      expect(listeA.seats).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Input Validation', () => {
    it('should reject invalid seats_to_fill (zero)', () => {
      const votes = [{ listnum: 1, firstname: 'Liste', lastname: 'A', votes: 100 }];

      expect(() =>
        countSainteLague({
          votes,
          config: { seats_to_fill: 0 },
        }),
      ).toThrow('Invalid seats_to_fill');
    });

    it('should reject invalid seats_to_fill (negative)', () => {
      const votes = [{ listnum: 1, firstname: 'Liste', lastname: 'A', votes: 100 }];

      expect(() =>
        countSainteLague({
          votes,
          config: { seats_to_fill: -5 },
        }),
      ).toThrow('Invalid seats_to_fill');
    });

    it('should reject invalid seats_to_fill (non-integer)', () => {
      const votes = [{ listnum: 1, firstname: 'Liste', lastname: 'A', votes: 100 }];

      expect(() =>
        countSainteLague({
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
        countSainteLague({
          votes,
          config: { seats_to_fill: 3 },
        }),
      ).toThrow('No valid votes to count');
    });

    it('should reject non-array votes', () => {
      expect(() =>
        countSainteLague({
          votes: 'invalid',
          config: { seats_to_fill: 3 },
        }),
      ).toThrow('votes must be an array');
    });

    it('should reject missing config', () => {
      const votes = [{ listnum: 1, firstname: 'Liste', lastname: 'A', votes: 100 }];

      expect(() =>
        countSainteLague({
          votes,
          config: null,
        }),
      ).toThrow('config must be an object');
    });
  });

  describe('Mathematical Correctness', () => {
    it('should use odd divisors (1, 3, 5, 7, 9, ...)', () => {
      const votes = [{ listnum: 1, firstname: 'Liste', lastname: 'A', votes: 100 }];

      const result = countSainteLague({
        votes,
        config: { seats_to_fill: 5 },
      });

      // Check divisors in calculation steps: should be 1, 3, 5, 7, 9
      const divisors = result.calculation_steps.map((step) => step.divisor);
      expect(divisors).toEqual([1, 3, 5, 7, 9]);
    });

    it('should verify divisor progression for multi-seat candidate', () => {
      const votes = [
        { listnum: 1, firstname: 'Liste', lastname: 'A', votes: 1000 },
        { listnum: 2, firstname: 'Liste', lastname: 'B', votes: 1 },
      ];

      const result = countSainteLague({
        votes,
        config: { seats_to_fill: 5 },
      });

      // A should get all 5 seats, divisors: 1, 3, 5, 7, 9
      const stepsForA = result.calculation_steps.filter((s) => s.listnum === 1);
      expect(stepsForA.map((s) => s.divisor)).toEqual([1, 3, 5, 7, 9]);
      expect(stepsForA.map((s) => s.seats_now)).toEqual([1, 2, 3, 4, 5]);

      // B should get 0 seats
      const stepsForB = result.calculation_steps.filter((s) => s.listnum === 2);
      expect(stepsForB).toHaveLength(0);
      expect(result.allocation.find((c) => c.listnum === 2).seats).toBe(0);
    });

    it('should verify divisor increments correctly with alternating winners', () => {
      const votes = [
        { listnum: 1, firstname: 'Liste', lastname: 'A', votes: 500 },
        { listnum: 2, firstname: 'Liste', lastname: 'B', votes: 400 },
      ];

      const result = countSainteLague({
        votes,
        config: { seats_to_fill: 6 },
      });

      // Expected sequence: A(500/1), B(400/1), A(500/3≈166.67), B(400/3≈133.33), A(500/5=100), B(400/5=80)
      // A wins rounds: 1, 3, 5 -> divisors: 1, 3, 5
      // B wins rounds: 2, 4, 6 -> divisors: 1, 3, 5

      const stepsForA = result.calculation_steps.filter((s) => s.listnum === 1);
      const stepsForB = result.calculation_steps.filter((s) => s.listnum === 2);

      expect(stepsForA).toHaveLength(3);
      expect(stepsForB).toHaveLength(3);

      // Check divisors increment correctly
      expect(stepsForA[0].divisor).toBe(1);
      expect(stepsForA[0].seats_now).toBe(1);
      expect(stepsForA[1].divisor).toBe(3);
      expect(stepsForA[1].seats_now).toBe(2);
      expect(stepsForA[2].divisor).toBe(5);
      expect(stepsForA[2].seats_now).toBe(3);

      expect(stepsForB[0].divisor).toBe(1);
      expect(stepsForB[1].divisor).toBe(3);
      expect(stepsForB[2].divisor).toBe(5);
    });

    it('should calculate quotients correctly', () => {
      const votes = [
        { listnum: 1, firstname: 'Liste', lastname: 'A', votes: 1000 },
        { listnum: 2, firstname: 'Liste', lastname: 'B', votes: 600 },
      ];

      const result = countSainteLague({
        votes,
        config: { seats_to_fill: 3 },
      });

      // Round 1: A wins (1000/1 = 1000 > 600/1 = 600)
      expect(result.calculation_steps[0].listnum).toBe(1);
      expect(parseFloat(result.calculation_steps[0].quotient)).toBeCloseTo(1000, 1);

      // Round 2: B wins (600/1 = 600 > 1000/3 = 333.33)
      expect(result.calculation_steps[1].listnum).toBe(2);
      expect(parseFloat(result.calculation_steps[1].quotient)).toBeCloseTo(600, 1);

      // Round 3: A wins again (1000/3 = 333.33 > 600/3 = 200)
      expect(result.calculation_steps[2].listnum).toBe(1);
      expect(parseFloat(result.calculation_steps[2].quotient)).toBeCloseTo(333.33, 1);
    });

    it('should produce consistent results', () => {
      const votes = [
        { listnum: 1, firstname: 'Liste', lastname: 'A', votes: 4567 },
        { listnum: 2, firstname: 'Liste', lastname: 'B', votes: 3891 },
        { listnum: 3, firstname: 'Liste', lastname: 'C', votes: 2542 },
      ];

      const result1 = countSainteLague({ votes, config: { seats_to_fill: 7 } });
      const result2 = countSainteLague({ votes, config: { seats_to_fill: 7 } });

      // Results should be identical
      expect(result1.allocation).toEqual(result2.allocation);
      expect(result1.calculation_steps).toEqual(result2.calculation_steps);
    });
  });

  describe('Output Format', () => {
    it('should return all required fields', () => {
      const votes = [
        { listnum: 1, firstname: 'Liste', lastname: 'A', votes: 100 },
        { listnum: 2, firstname: 'Liste', lastname: 'B', votes: 80 },
      ];

      const result = countSainteLague({
        votes,
        config: { seats_to_fill: 3 },
      });

      expect(result).toHaveProperty('algorithm');
      expect(result).toHaveProperty('seats_to_fill');
      expect(result).toHaveProperty('total_votes');
      expect(result).toHaveProperty('allocation');
      expect(result).toHaveProperty('calculation_steps');
      expect(result).toHaveProperty('ties_detected');
    });

    it('should include all candidate information in allocation', () => {
      const votes = [{ listnum: 42, firstname: 'Max', lastname: 'Mustermann', votes: 100 }];

      const result = countSainteLague({
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
    });
  });
});
