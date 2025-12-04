/**
 * Majority vote counting: Highest votes win (no proportional allocation).
 * Used for: Fachschaftsvorstand (Wahlart 2), Dekane (Wahlart 8),
 * Prodekane (Wahlart 10), Professorenwahl (Wahlart 11)
 *
 * Algorithm: Sort candidates by votes descending, elect top N.
 *
 * @module majority-vote
 */

// Constants
const PERCENTAGE_MULTIPLIER = 100;

/**
 * Performs majority vote counting with tie detection.
 *
 * @param {Object} params - Counting parameters
 * @param {Array<Object>} params.votes - Vote data from counting VIEW
 * @param {number} params.votes[].listnum - Candidate number
 * @param {string} params.votes[].firstname - Candidate first name
 * @param {string} params.votes[].lastname - Candidate last name
 * @param {number} params.votes[].votes - Vote count
 * @param {Object} params.config - Counting configuration
 * @param {number} params.config.seats_to_fill - Number of seats to allocate
 * @param {string} params.config.counting_method - Method: 'highest_votes_absolute' or 'highest_votes_simple'
 * @returns {Object} Election result with elected candidates
 * @throws {Error} If seats_to_fill < 1 or no candidates
 *
 * @example
 * const result = countMajorityVote({
 *   votes: [
 *     { listnum: 1, firstname: 'Alice', lastname: 'Müller', votes: 342 },
 *     { listnum: 2, firstname: 'Bob', lastname: 'Schmidt', votes: 287 },
 *     { listnum: 3, firstname: 'Charlie', lastname: 'Weber', votes: 201 }
 *   ],
 *   config: { seats_to_fill: 2 }
 * });
 * // Returns: { elected: [Alice, Bob], ties_detected: false }
 */
export const countMajorityVote = ({ votes, config }) => {
  // Input validation
  if (!Array.isArray(votes)) {
    throw new Error('votes must be an array');
  }

  if (!config || typeof config !== 'object') {
    throw new Error('config must be an object');
  }

  const { seats_to_fill } = config;

  // Validation: seats_to_fill must be positive integer
  if (!seats_to_fill || seats_to_fill < 1 || !Number.isInteger(seats_to_fill)) {
    throw new Error(
      `Invalid seats_to_fill: ${seats_to_fill}. Must be >= 1 for majority vote counting.`,
    );
  }

  // Validation: must have candidates
  if (votes.length === 0) {
    throw new Error('No candidates to count. votes array is empty.');
  }

  // Convert votes to numbers and sort candidates by vote count (descending)
  const sorted = [...votes]
    .map((v) => ({ ...v, votes: Number(v.votes) }))
    .sort((a, b) => b.votes - a.votes);

  // Take top N candidates (or all if fewer than seats available)
  const seatsAvailable = Math.min(seats_to_fill, sorted.length);
  const elected = sorted.slice(0, seatsAvailable);

  // Tie detection: Check if candidates at cutoff have same votes as next candidate
  const cutoffVotes = elected[elected.length - 1]?.votes;
  const tieCandidates = sorted.filter(
    (candidate) =>
      candidate.votes === cutoffVotes && !elected.find((e) => e.listnum === candidate.listnum),
  );

  const hasTies = tieCandidates.length > 0;

  // If tie detected, ALL candidates with cutoffVotes should be marked as tied
  // This includes elected candidates with the same vote count
  const allTiedCandidates = hasTies
    ? sorted.filter((candidate) => candidate.votes === cutoffVotes)
    : [];

  // Absolute majority check: Only performed for 'highest_votes_absolute' method
  const requiresAbsoluteMajority = config.counting_method === 'highest_votes_absolute';

  let absoluteMajorityAchieved = null;
  let absoluteMajorityThreshold = null;
  let majorityInfo = null;

  // Calculate total votes for percentage calculation
  const totalVotes = votes.reduce((sum, candidate) => sum + Number(candidate.votes), 0);

  if (requiresAbsoluteMajority) {
    // For absolute majority: Winner must have >50% of all cast votes
    absoluteMajorityThreshold = totalVotes > 0 ? totalVotes / 2 : 0;
    const topCandidateVotes = elected[0]?.votes || 0;
    absoluteMajorityAchieved = totalVotes > 0 && topCandidateVotes > absoluteMajorityThreshold;

    majorityInfo =
      totalVotes > 0
        ? absoluteMajorityAchieved
          ? `Absolute majority achieved: ${topCandidateVotes} > ${absoluteMajorityThreshold.toFixed(1)} votes (${((topCandidateVotes / totalVotes) * PERCENTAGE_MULTIPLIER).toFixed(2)}%)`
          : `No absolute majority. Top candidate: ${topCandidateVotes} ≤ ${absoluteMajorityThreshold.toFixed(1)} votes (${((topCandidateVotes / totalVotes) * PERCENTAGE_MULTIPLIER).toFixed(2)}%). Runoff election required.`
        : 'Cannot calculate majority (no votes cast)';
  } else {
    // For simple majority: Highest votes win, no threshold check
    majorityInfo =
      'Simple majority (relative majority): Highest votes win without threshold requirement.';
  }

  return {
    algorithm: config.counting_method,
    seats_to_fill,
    seats_allocated: elected.length,
    elected: elected.map((candidate) => ({
      listnum: candidate.listnum,
      candidate: `${candidate.firstname} ${candidate.lastname}`,
      firstname: candidate.firstname,
      lastname: candidate.lastname,
      votes: candidate.votes,
      percentage:
        totalVotes > 0
          ? ((candidate.votes / totalVotes) * PERCENTAGE_MULTIPLIER).toFixed(2)
          : '0.00',
    })),
    // Full candidate list (sorted desc) for unified frontend rendering
    all_candidates: sorted.map((candidate) => {
      const isElected = elected.some((e) => e.listnum === candidate.listnum);
      // Mark ALL candidates with cutoffVotes as tied when hasTies is true
      const isTie = hasTies && allTiedCandidates.some((t) => t.listnum === candidate.listnum);
      // If candidate is in a tie, they are NOT considered elected (resolution required)
      return {
        listnum: candidate.listnum,
        candidate: `${candidate.firstname} ${candidate.lastname}`,
        firstname: candidate.firstname,
        lastname: candidate.lastname,
        votes: candidate.votes,
        percentage:
          totalVotes > 0
            ? ((candidate.votes / totalVotes) * PERCENTAGE_MULTIPLIER).toFixed(2)
            : '0.00',
        is_elected: isElected && !isTie,
        is_tie: isTie,
      };
    }),
    absolute_majority_achieved: absoluteMajorityAchieved,
    absolute_majority_threshold: absoluteMajorityThreshold,
    absolute_majority_required: requiresAbsoluteMajority,
    total_votes: totalVotes,
    majority_info: majorityInfo,
    ties_detected: hasTies,
    tie_candidates: tieCandidates.map((candidate) => ({
      listnum: candidate.listnum,
      candidate: `${candidate.firstname} ${candidate.lastname}`,
      firstname: candidate.firstname,
      lastname: candidate.lastname,
      votes: candidate.votes,
    })),
    resolution_required: hasTies,
    tie_info: hasTies
      ? `Tie detected at ${cutoffVotes} votes: ${allTiedCandidates.length} candidate(s) have same vote count. ` +
        `Affected candidates: ${allTiedCandidates.map((c) => `${c.firstname} ${c.lastname}`).join(', ')}. ` +
        `Manual resolution (drawing lots/Losentscheid) required.`
      : null,
  };
};
