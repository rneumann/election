/**
 * Counts referendum results with hybrid logic:
 * - 3 options: Binary YES/NO/ABSTAIN logic (legacy compatibility)
 * - N options (≠3): Plurality winner-takes-all logic
 *
 * Used for: Urabstimmungen (Wahlart 3), Prorektor:innen-Wahl (Wahlart 7)
 *
 * @module referendum
 */

// Constants for referendum voting options (used in binary mode)
const LISTNUM_YES = 1;
const LISTNUM_NO = 2;
const LISTNUM_ABSTAIN = 3;
const PERCENTAGE_MULTIPLIER = 100;
const PERCENTAGE_DECIMALS = 2;

/**
 * Binary referendum counting (3 options: YES/NO/ABSTAIN).
 * Legacy compatibility mode for standard referendums.
 *
 * @param {Array<Object>} votes - Vote data (must have exactly 3 entries)
 * @param {Object} config - Counting configuration
 * @returns {Object} Binary referendum result with ACCEPTED/REJECTED status
 */
const countBinaryReferendum = (votes, config) => {
  // Extract vote counts by listnum
  const yesVotes = Number(votes.find((v) => v.listnum === LISTNUM_YES)?.votes || 0);
  const noVotes = Number(votes.find((v) => v.listnum === LISTNUM_NO)?.votes || 0);
  const abstainVotes = Number(votes.find((v) => v.listnum === LISTNUM_ABSTAIN)?.votes || 0);

  // Validate vote counts are non-negative
  if (yesVotes < 0 || noVotes < 0 || abstainVotes < 0) {
    throw new Error('Vote counts cannot be negative');
  }

  const totalVotes = yesVotes + noVotes + abstainVotes;
  const validVotes = yesVotes + noVotes; // Abstain not counted for majority

  // Quorum check (optional, default 0 = no quorum required)
  const quorum = config.quorum || 0;
  const quorumReached = totalVotes >= quorum;

  // Determine majority type (simple or absolute)
  const majorityType = config.majority_type || 'simple';

  // Calculate required YES votes based on majority type
  let requiredYesVotes;
  if (majorityType === 'absolute') {
    // Absolute majority: >50% of ALL votes (including abstain)
    requiredYesVotes = totalVotes / 2;
  } else {
    // Simple majority: >50% of valid votes (excluding abstain)
    requiredYesVotes = validVotes / 2;
  }

  // Referendum is ACCEPTED if quorum reached AND yes votes exceed threshold
  const accepted = quorumReached && yesVotes > requiredYesVotes;

  // Calculate percentages (based on valid votes only)
  const yesPercentage =
    validVotes > 0
      ? ((yesVotes / validVotes) * PERCENTAGE_MULTIPLIER).toFixed(PERCENTAGE_DECIMALS)
      : '0.00';
  const noPercentage =
    validVotes > 0
      ? ((noVotes / validVotes) * PERCENTAGE_MULTIPLIER).toFixed(PERCENTAGE_DECIMALS)
      : '0.00';
  const abstainPercentage =
    totalVotes > 0
      ? ((abstainVotes / totalVotes) * PERCENTAGE_MULTIPLIER).toFixed(PERCENTAGE_DECIMALS)
      : '0.00';

  return {
    algorithm: 'yes_no_referendum',
    result: accepted ? 'ACCEPTED' : 'REJECTED',
    yes_votes: yesVotes,
    no_votes: noVotes,
    abstain_votes: abstainVotes,
    yes_percentage: yesPercentage,
    no_percentage: noPercentage,
    abstain_percentage: abstainPercentage,
    turnout: totalVotes,
    valid_votes: validVotes,
    quorum_required: quorum,
    quorum_reached: quorumReached,
    majority_type: majorityType,
  };
};

/**
 * Plurality referendum counting (N options).
 * Winner-takes-all logic for multi-option referendums.
 *
 * @param {Array<Object>} votes - Vote data
 * @param {Object} config - Counting configuration
 * @returns {Object} Plurality referendum result with winner information
 */
const countPluralityReferendum = (votes, config) => {
  // Build candidates array with names from firstname/lastname
  const allCandidates = votes.map((v) => ({
    listnum: v.listnum,
    name: `${v.firstname || ''} ${v.lastname || ''}`.trim() || `Option ${v.listnum}`,
    votes: Number(v.votes || 0),
  }));

  // Validate vote counts
  if (allCandidates.some((c) => c.votes < 0)) {
    throw new Error('Vote counts cannot be negative');
  }

  // Calculate total votes
  const totalVotes = allCandidates.reduce((sum, c) => sum + c.votes, 0);

  // Calculate percentages
  allCandidates.forEach((candidate) => {
    candidate.percentage =
      totalVotes > 0
        ? ((candidate.votes / totalVotes) * PERCENTAGE_MULTIPLIER).toFixed(PERCENTAGE_DECIMALS)
        : '0.00';
  });

  // Sort by votes (highest first)
  allCandidates.sort((a, b) => b.votes - a.votes);

  // Winner detection
  const maxVotes = allCandidates[0]?.votes || 0;
  const winners = allCandidates.filter((c) => c.votes === maxVotes);
  const tiesDetected = winners.length > 1;

  // Quorum check
  const quorumRequired = config?.quorum || 0;
  const quorumReached = totalVotes >= quorumRequired;

  // Winner is only determined if no tie and quorum reached
  const hasWinner = !tiesDetected && quorumReached && allCandidates.length > 0;

  return {
    algorithm: 'yes_no_referendum', // Keep name for compatibility
    mode: 'plurality',
    all_candidates: allCandidates,
    winner: hasWinner ? allCandidates[0] : null,
    winner_name: hasWinner ? allCandidates[0].name : null,
    ties_detected: tiesDetected,
    tied_candidates: tiesDetected ? winners : [],
    total_votes: totalVotes,
    turnout: totalVotes,
  };
};

/**
 * Performs referendum counting with automatic mode detection.
 * Delegates to binary or plurality counting based on number of options.
 *
 * @param {Object} params - Counting parameters
 * @param {Array<Object>} params.votes - Vote data from counting VIEW
 * @param {number} params.votes[].listnum - Option number
 * @param {string} params.votes[].firstname - Option first name
 * @param {string} params.votes[].lastname - Option last name
 * @param {number} params.votes[].votes - Vote count for this option
 * @param {Object} params.config - Counting configuration
 * @param {number} [params.config.quorum=0] - Minimum total votes required
 * @param {string} [params.config.majority_type='simple'] - 'simple' (>50% of valid) or 'absolute' (>50% of total)
 * @returns {Object} Referendum result (format depends on mode)
 *
 * @example
 * // 3 options - binary mode
 * const result = countReferendum({
 *   votes: [
 *     { listnum: 1, firstname: 'Ja', lastname: '', votes: 1247 },
 *     { listnum: 2, firstname: 'Nein', lastname: '', votes: 893 },
 *     { listnum: 3, firstname: 'Enthaltung', lastname: '', votes: 156 }
 *   ],
 *   config: { quorum: 1000, majority_type: 'simple' }
 * });
 * // Returns: { result: 'ACCEPTED', yes_votes: 1247, ... }
 *
 * // 10 options - plurality mode
 * const result2 = countReferendum({
 *   votes: [
 *     { listnum: 1, firstname: 'Option A', lastname: '', votes: 500 },
 *     { listnum: 2, firstname: 'Option B', lastname: '', votes: 800 },
 *     // ... 8 more options
 *   ],
 *   config: { quorum: 1000 }
 * });
 * // Returns: { mode: 'plurality', winner_name: 'Option B', all_candidates: [...], ... }
 */
export const countReferendum = ({ votes, config }) => {
  // Input validation
  if (!Array.isArray(votes)) {
    throw new Error('votes must be an array');
  }

  if (votes.length === 0) {
    throw new Error('No candidates to count. votes array is empty');
  }

  if (!config || typeof config !== 'object') {
    throw new Error('config must be an object');
  }

  // Mode detection: 3 options = binary, otherwise = plurality
  if (votes.length === 3) {
    return countBinaryReferendum(votes, config);
  } else {
    return countPluralityReferendum(votes, config);
  }
};
