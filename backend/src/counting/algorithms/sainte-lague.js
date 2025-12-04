/**
 * Sainte-Laguë counting (Divisor Method with Odd Divisors).
 * Used for: Studierendenparlament (Wahlart 1.1) - Verhältniswahl
 *
 * Algorithm:
 * - Divisor series: 1, 3, 5, 7, 9, 11, ...
 * - Iteratively assigns seats to list/candidate with highest quotient
 * - Quotient = votes / (2 × current_seats + 1)
 *
 * Advantages:
 * - Fairest method for small parties (odd divisors prevent over-representation)
 * - BSI-compliant and mathematically proven optimal
 *
 * BSI-Note: Uses aggregated vote data only. No individual ballot access.
 *
 * @module sainte-lague
 */

// Constants for Sainte-Laguë calculations
const DIVISOR_MULTIPLIER = 2; // For odd divisor series: 2n + 1
const DIVISOR_OFFSET = 1; // Offset for odd series (1, 3, 5, 7...)
const QUOTIENT_TOLERANCE = 0.0001; // Tolerance for tie detection
const QUOTIENT_DECIMALS = 4; // Decimal places for quotient display

/**
 * Performs Sainte-Laguë proportional seat allocation.
 *
 * @param {Object} params - Counting parameters
 * @param {Array<Object>} params.votes - Vote data from counting VIEW
 * @param {number} params.votes[].listnum - List/Candidate number
 * @param {string} params.votes[].firstname - Candidate/List name (first)
 * @param {string} params.votes[].lastname - Candidate/List name (last)
 * @param {number} params.votes[].votes - Vote count
 * @param {Object} params.config - Counting configuration
 * @param {number} params.config.seats_to_fill - Total seats to allocate
 * @returns {Object} Allocation result with seat distribution and calculation steps
 * @throws {Error} If seats_to_fill < 1 or total votes = 0
 *
 * @example
 * const result = countSainteLague({
 *   votes: [
 *     { listnum: 1, firstname: 'Liste', lastname: 'A', votes: 4567 },
 *     { listnum: 2, firstname: 'Liste', lastname: 'B', votes: 3891 },
 *     { listnum: 3, firstname: 'Liste', lastname: 'C', votes: 2542 }
 *   ],
 *   config: { seats_to_fill: 5 }
 * });
 * // Returns: { allocation: [...], calculation_steps: [...] }
 */
export const countSainteLague = ({ votes, config }) => {
  // Input validation
  if (!Array.isArray(votes)) {
    throw new Error('votes must be an array');
  }

  if (!config || typeof config !== 'object') {
    throw new Error('config must be an object');
  }

  const { seats_to_fill } = config;

  // Validation: seats must be positive integer
  if (!seats_to_fill || seats_to_fill < 1 || !Number.isInteger(seats_to_fill)) {
    throw new Error(
      `Invalid seats_to_fill: ${seats_to_fill}. Must be a positive integer >= 1 for Sainte-Laguë counting.`,
    );
  }

  // Calculate total votes
  const totalVotes = votes.reduce((sum, candidate) => sum + Number(candidate.votes), 0);

  // Validation: must have votes
  if (totalVotes === 0) {
    throw new Error('No valid votes to count. Total votes = 0.');
  }

  // Initialize candidates with zero seats
  const candidates = votes.map((candidate) => ({
    listnum: candidate.listnum,
    name: `${candidate.firstname} ${candidate.lastname}`,
    firstname: candidate.firstname,
    lastname: candidate.lastname,
    votes: Number(candidate.votes),
    seats: 0,
  }));

  const calculationSteps = [];

  // Track tie information
  let finalTieInfo = '';
  let finalTieCandidates = [];

  // Allocate seats iteratively (one per round)
  for (let round = 1; round <= seats_to_fill; round++) {
    // Calculate current quotients for all candidates
    const quotients = candidates.map((candidate) => {
      // Divisor formula: 2 × seats + 1 (odd numbers: 1, 3, 5, 7, ...)
      const divisor = DIVISOR_MULTIPLIER * candidate.seats + DIVISOR_OFFSET;
      const quotient = candidate.votes / divisor;

      return {
        candidate,
        quotient,
        divisor,
      };
    });

    // Find candidate with highest quotient
    const winner = quotients.reduce((max, current) =>
      current.quotient > max.quotient ? current : max,
    );

    // Tie detection: Check if multiple candidates have same quotient OR same votes
    const tiedQuotients = quotients.filter(
      (q) => Math.abs(q.quotient - winner.quotient) < QUOTIENT_TOLERANCE,
    );

    // Additional check: candidates with equal votes at same seat count should tie
    const sameVotesTied = quotients.filter(
      (q) =>
        q.candidate.votes === winner.candidate.votes &&
        q.candidate.seats === winner.candidate.seats &&
        q.candidate.listnum !== winner.candidate.listnum,
    );

    let tieDetected = false;
    let tieInfo = '';
    let tieCandidates = [];

    // Merge both types of ties: include all quotient ties PLUS any additional same-vote candidates
    const allTiedCandidates = [...tiedQuotients];

    // Add same-vote candidates that aren't already in tiedQuotients
    for (const svt of sameVotesTied) {
      if (!allTiedCandidates.find((tc) => tc.candidate.listnum === svt.candidate.listnum)) {
        allTiedCandidates.push(svt);
      }
    }

    if (allTiedCandidates.length > 1) {
      // Tie detected - use deterministic tie-breaking (lowest listnum wins)
      // But record tie for transparency
      tieDetected = true;

      const deterministicWinner = allTiedCandidates.reduce((min, current) =>
        current.candidate.listnum < min.candidate.listnum ? current : min,
      );

      tieCandidates = allTiedCandidates.map((q) => ({
        listnum: q.candidate.listnum,
        name: q.candidate.name,
        votes: q.candidate.votes,
        quotient: q.quotient.toFixed(QUOTIENT_DECIMALS),
        divisor: q.divisor,
        current_seats: q.candidate.seats,
      }));

      const tiedNames = tieCandidates.map((c) => c.name).join(', ');

      // Determine if this is primarily a vote equity issue or quotient tie
      const hasVoteEquityIssue = sameVotesTied.length > 0;
      const tieReason = hasVoteEquityIssue
        ? `equal votes (${winner.candidate.votes})`
        : `quotient ${winner.quotient.toFixed(QUOTIENT_DECIMALS)}`;

      tieInfo =
        `Round ${round}: ${allTiedCandidates.length} candidates tied with ${tieReason}. ` +
        `Affected candidates: ${tiedNames}. ` +
        `Seat allocated to ${deterministicWinner.candidate.name} (listnum ${deterministicWinner.candidate.listnum}) using deterministic tie-breaking (lowest listnum).`;

      // Assign seat to deterministic winner
      deterministicWinner.candidate.seats += 1;

      // Record calculation step
      calculationSteps.push({
        round,
        winner: deterministicWinner.candidate.name,
        listnum: deterministicWinner.candidate.listnum,
        quotient: deterministicWinner.quotient.toFixed(QUOTIENT_DECIMALS),
        divisor: deterministicWinner.divisor,
        seats_now: deterministicWinner.candidate.seats,
        tie_detected: true,
      });
    } else {
      // No tie - assign seat to winner normally
      winner.candidate.seats += 1;

      // Record calculation step for transparency
      calculationSteps.push({
        round,
        winner: winner.candidate.name,
        listnum: winner.candidate.listnum,
        quotient: winner.quotient.toFixed(QUOTIENT_DECIMALS),
        divisor: winner.divisor,
        seats_now: winner.candidate.seats,
      });
    }

    // Store tie information if detected (for final result)
    if (tieDetected && !finalTieInfo) {
      finalTieInfo = tieInfo;
      finalTieCandidates = tieCandidates;
    }
  }

  // Verify all seats allocated (sanity check)
  const finalSeats = candidates.reduce((sum, candidate) => sum + candidate.seats, 0);
  if (finalSeats !== seats_to_fill) {
    throw new Error(
      `Seat allocation error: Allocated ${finalSeats} seats but should allocate ${seats_to_fill}`,
    );
  }

  // Build result object
  // Collect all listnums involved in ties across all rounds
  const tiedListnums = new Set();
  if (finalTieCandidates && finalTieCandidates.length > 0) {
    finalTieCandidates.forEach((tc) => tiedListnums.add(tc.listnum));
  }

  // Sort allocation by seats (desc), then votes (desc), then listnum (asc)
  const sortedAllocation = candidates
    .map((candidate) => ({
      listnum: candidate.listnum,
      candidate: candidate.name,
      firstname: candidate.firstname,
      lastname: candidate.lastname,
      votes: candidate.votes,
      seats: candidate.seats,
      is_tie: false, // Will be set below if vote equity violation exists
    }))
    .sort((a, b) => {
      if (b.seats !== a.seats) {
        return b.seats - a.seats;
      }
      if (b.votes !== a.votes) {
        return b.votes - a.votes;
      }
      return a.listnum - b.listnum;
    });

  // Check for vote equity violations: candidates with equal votes but different seats
  // Mark ALL candidates involved in such violations
  const voteToSeatsMap = new Map();
  candidates.forEach((c) => {
    if (!voteToSeatsMap.has(c.votes)) {
      voteToSeatsMap.set(c.votes, new Set());
    }
    voteToSeatsMap.get(c.votes).add(c.seats);
  });

  // Check if vote equity violations exist
  let hasVoteEquityViolations = false;
  const equityViolations = [];
  for (const [votes, seatsSet] of voteToSeatsMap.entries()) {
    if (seatsSet.size > 1) {
      hasVoteEquityViolations = true;
      const affectedCandidates = candidates.filter((c) => c.votes === votes);
      equityViolations.push({
        votes,
        seats: [...seatsSet].sort((a, b) => b - a),
        candidates: affectedCandidates
          .map((c) => `${c.name} (${c.seats} ${c.seats === 1 ? 'Sitz' : 'Sitze'})`)
          .join(', '),
      });
    }
  }

  // Mark candidates where their vote count maps to multiple different seat counts
  sortedAllocation.forEach((candidate) => {
    const seatsForThisVoteCount = voteToSeatsMap.get(candidate.votes);
    if (seatsForThisVoteCount && seatsForThisVoteCount.size > 1) {
      candidate.is_tie = true;
    }
  });

  // Update tie_info if vote equity violations exist
  // Vote equity violations take precedence or are appended to existing tie info
  if (hasVoteEquityViolations) {
    const violationDescriptions = equityViolations
      .map((v) => `${v.votes} ${v.votes === 1 ? 'Stimme' : 'Stimmen'}: ${v.candidates}`)
      .join('; ');
    const equityMessage = `Stimmengleichheit mit unterschiedlicher Sitzzuteilung erkannt. Betroffene Kandidaten: ${violationDescriptions}. Losentscheid erforderlich für faire Verteilung.`;

    if (finalTieInfo) {
      // Append equity violation to existing tie info
      finalTieInfo = `${finalTieInfo} --- ${equityMessage}`;
    } else {
      finalTieInfo = equityMessage;
    }
  }

  const result = {
    algorithm: 'sainte_lague',
    seats_to_fill,
    total_votes: totalVotes,
    allocation: sortedAllocation,
    calculation_steps: calculationSteps,
    ties_detected: finalTieInfo !== '',
  };

  // Add tie information if any ties were detected
  if (finalTieInfo) {
    result.tie_info = finalTieInfo;
    result.tie_candidates = finalTieCandidates;
  }

  return result;
};
