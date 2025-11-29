/**
 * Hare-Niemeyer counting (Largest Remainder Method).
 * Used for: Senat (Wahlart 5.1), Fakultätsrat (Wahlart 6.1) - Verhältniswahl
 *
 * Algorithm:
 * 1. Calculate quota: (votes / total_votes) × seats
 * 2. Assign floor(quota) seats to each list
 * 3. Distribute remaining seats by largest remainder (descending)
 *
 * BSI-Note: Uses aggregated vote data only. No individual ballot access.
 *
 * @module hare-niemeyer
 */

// Constants for Hare-Niemeyer calculations
const REMAINDER_TOLERANCE = 0.001; // Tolerance for floating-point comparison (0.1%) - erhöht für sicherere Tie-Detection
const QUOTA_DECIMALS = 4; // Decimal places for quota display

/**
 * Performs Hare-Niemeyer proportional seat allocation.
 *
 * @param {Object} params - Counting parameters
 * @param {Array<Object>} params.votes - Vote data from counting VIEW
 * @param {number} params.votes[].listnum - List/Candidate number
 * @param {string} params.votes[].firstname - Candidate/List name (first)
 * @param {string} params.votes[].lastname - Candidate/List name (last)
 * @param {number} params.votes[].votes - Vote count
 * @param {Object} params.config - Counting configuration
 * @param {number} params.config.seats_to_fill - Total seats to allocate
 * @returns {Object} Allocation result with seat distribution
 * @throws {Error} If seats_to_fill < 1 or total votes = 0
 *
 * @example
 * const result = countHareNiemeyer({
 *   votes: [
 *     { listnum: 1, firstname: 'Liste', lastname: 'A', votes: 4567 },
 *     { listnum: 2, firstname: 'Liste', lastname: 'B', votes: 3891 },
 *     { listnum: 3, firstname: 'Liste', lastname: 'C', votes: 2542 }
 *   ],
 *   config: { seats_to_fill: 5 }
 * });
 * // Returns: { allocation: [A:2 seats, B:2 seats, C:1 seat] }
 */
export const countHareNiemeyer = ({ votes, config }) => {
  // Input validation
  if (!Array.isArray(votes)) {
    throw new Error('votes must be an array');
  }

  if (!config || typeof config !== 'object') {
    throw new Error('config must be an object');
  }

  const { seats_to_fill } = config;

  // Validation: seats must be positive
  if (!seats_to_fill || seats_to_fill < 1 || !Number.isInteger(seats_to_fill)) {
    throw new Error(
      `Invalid seats_to_fill: ${seats_to_fill}. Must be a positive integer >= 1 for Hare-Niemeyer counting.`,
    );
  }

  // Calculate total votes
  const totalVotes = votes.reduce((sum, candidate) => sum + Number(candidate.votes), 0);

  // Validation: must have votes
  if (totalVotes === 0) {
    throw new Error('No valid votes to count. Total votes = 0.');
  }

  // Step 1: Calculate quota for each candidate/list
  const candidates = votes.map((candidate) => {
    const candidateVotes = Number(candidate.votes);
    const quota = (candidateVotes / totalVotes) * seats_to_fill;
    return {
      listnum: candidate.listnum,
      name: `${candidate.firstname} ${candidate.lastname}`,
      firstname: candidate.firstname,
      lastname: candidate.lastname,
      votes: candidateVotes,
      quota,
      seats: Math.floor(quota), // Initial seat allocation (integer part)
      remainder: quota - Math.floor(quota), // Decimal part for remainder distribution
    };
  });

  // Step 2: Count initially assigned seats
  let assignedSeats = candidates.reduce((sum, candidate) => sum + candidate.seats, 0);

  // Step 3: Distribute remaining seats by largest remainder
  const remainingSeats = seats_to_fill - assignedSeats;

  if (remainingSeats > 0) {
    // Sort by remainder (descending), then by votes (descending) for stable tie-breaking
    // This ensures candidates with equal votes get treated identically
    const sortedByRemainder = [...candidates].sort((a, b) => {
      const remainderDiff = b.remainder - a.remainder;
      if (Math.abs(remainderDiff) < REMAINDER_TOLERANCE) {
        // If remainders are equal, sort by votes (descending) then by listnum (ascending)
        const votesDiff = b.votes - a.votes;
        if (votesDiff === 0) {
          return a.listnum - b.listnum; // Deterministic tie-breaking by listnum
        }
        return votesDiff;
      }
      return remainderDiff;
    });

    // Track which candidates got remainder seats (for tie detection)
    const gotRemainderSeat = new Set();

    // Assign remaining seats to candidates with largest remainders
    for (let i = 0; i < remainingSeats; i++) {
      // Safe array access: i is guaranteed < sortedByRemainder.length
      // eslint-disable-next-line security/detect-object-injection
      const candidate = sortedByRemainder[i];
      if (candidate) {
        candidate.seats += 1;
        gotRemainderSeat.add(candidate.listnum); // Track remainder seat allocation
      }
    }

    // Tie detection: Check if remainder at cutoff equals next remainder
    // OR if candidates with same votes got different number of seats
    if (remainingSeats < sortedByRemainder.length) {
      // Safe array access: indices validated by condition above
      const cutoffCandidate = sortedByRemainder[remainingSeats - 1];
      // eslint-disable-next-line security/detect-object-injection
      const nextCandidate = sortedByRemainder[remainingSeats];
      const cutoffRemainder = cutoffCandidate?.remainder;
      const nextRemainder = nextCandidate?.remainder;

      // Check for remainder tie using defined tolerance
      const remainderTie = Math.abs(cutoffRemainder - nextRemainder) < REMAINDER_TOLERANCE;

      // Also check if candidates with equal votes have different seat counts (vote equity violation)
      const voteEquityViolation = candidates.some((c1) =>
        candidates.some(
          (c2) => c1.listnum !== c2.listnum && c1.votes === c2.votes && c1.seats !== c2.seats,
        ),
      );

      if (remainderTie || voteEquityViolation) {
        // Collect ALL candidates with the same remainder at cutoff
        const tiedCandidates = sortedByRemainder.filter(
          (c) => Math.abs(c.remainder - cutoffRemainder) < REMAINDER_TOLERANCE,
        );

        // Build detailed tie message
        const tiedNames = tiedCandidates.map((c) => c.name).join(', ');
        const tiedWithRemainderSeats = tiedCandidates.filter((c) =>
          gotRemainderSeat.has(c.listnum),
        ).length;
        const totalTiedCandidates = tiedCandidates.length;

        // Build tie message based on type of tie
        let tieMessage = '';
        if (voteEquityViolation) {
          // Find candidates with same votes but different seats
          const equityViolations = [];
          for (const c1 of candidates) {
            for (const c2 of candidates) {
              if (c1.listnum < c2.listnum && c1.votes === c2.votes && c1.seats !== c2.seats) {
                equityViolations.push({ c1, c2 });
              }
            }
          }
          if (equityViolations.length > 0) {
            const violations = equityViolations
              .map(
                (v) =>
                  `${v.c1.name} and ${v.c2.name} (both ${v.c1.votes} votes, but ${v.c1.seats} vs ${v.c2.seats} seats)`,
              )
              .join('; ');
            tieMessage = `Vote equity violation: Candidates with equal votes received different seat counts. Affected: ${violations}. Drawing lots required for fair distribution.`;
          }
        }

        if (remainderTie && !tieMessage) {
          tieMessage =
            `Remainder tie: ${totalTiedCandidates} candidates with equal remainder ${cutoffRemainder.toFixed(QUOTA_DECIMALS)}, ` +
            `but only ${tiedWithRemainderSeats} remainder seat(s) available. Affected candidates: ${tiedNames}. ` +
            `Drawing lots required as no mathematical resolution possible.`;
        }

        return {
          algorithm: 'hare_niemeyer',
          seats_to_fill,
          total_votes: totalVotes,
          allocation: candidates.map((candidate) => ({
            listnum: candidate.listnum,
            candidate: candidate.name,
            firstname: candidate.firstname,
            lastname: candidate.lastname,
            votes: candidate.votes,
            quota: candidate.quota.toFixed(QUOTA_DECIMALS),
            seats: candidate.seats,
            remainder: candidate.remainder.toFixed(QUOTA_DECIMALS),
          })),
          ties_detected: true,
          tie_info: tieMessage,
          tie_candidates: tiedCandidates.map((c) => ({
            listnum: c.listnum,
            name: c.name,
            remainder: c.remainder.toFixed(QUOTA_DECIMALS),
            got_remainder_seat: gotRemainderSeat.has(c.listnum),
          })),
        };
      }
    }
  }

  // Verify all seats allocated (sanity check)
  const finalSeats = candidates.reduce((sum, candidate) => sum + candidate.seats, 0);
  if (finalSeats !== seats_to_fill) {
    throw new Error(
      `Seat allocation error: Allocated ${finalSeats} seats but should allocate ${seats_to_fill}`,
    );
  }

  return {
    algorithm: 'hare_niemeyer',
    seats_to_fill,
    total_votes: totalVotes,
    allocation: candidates.map((candidate) => ({
      listnum: candidate.listnum,
      candidate: candidate.name,
      firstname: candidate.firstname,
      lastname: candidate.lastname,
      votes: candidate.votes,
      quota: candidate.quota.toFixed(QUOTA_DECIMALS),
      seats: candidate.seats,
      remainder: candidate.remainder.toFixed(QUOTA_DECIMALS),
    })),
    ties_detected: false,
  };
};
