/**
 * Counts referendum results (Yes/No/Abstain votes).
 * Used for: Urabstimmungen (Wahlart 3), Prorektor:innen-Wahl (Wahlart 7)
 *
 * Expected vote structure:
 * - listnum 1: YES votes
 * - listnum 2: NO votes
 * - listnum 3: ABSTAIN votes (optional)
 *
 * @module referendum
 */

// Constants for referendum voting options
const LISTNUM_YES = 1;
const LISTNUM_NO = 2;
const LISTNUM_ABSTAIN = 3;
const PERCENTAGE_MULTIPLIER = 100;
const PERCENTAGE_DECIMALS = 2;

/**
 * Performs referendum counting with quorum and majority checks.
 *
 * @param {Object} params - Counting parameters
 * @param {Array<Object>} params.votes - Vote data from counting VIEW
 * @param {number} params.votes[].listnum - Option number (1=Yes, 2=No, 3=Abstain)
 * @param {number} params.votes[].votes - Vote count for this option
 * @param {Object} params.config - Counting configuration
 * @param {number} [params.config.quorum=0] - Minimum total votes required
 * @param {string} [params.config.majority_type='simple'] - 'simple' (>50% of valid) or 'absolute' (>50% of total)
 * @returns {Object} Referendum result with acceptance status
 *
 * @example
 * const result = countReferendum({
 *   votes: [
 *     { listnum: 1, votes: 1247 },  // YES
 *     { listnum: 2, votes: 2893 },  // NO
 *     { listnum: 3, votes: 156 }    // ABSTAIN
 *   ],
 *   config: { quorum: 1000, majority_type: 'simple' }
 * });
 * // Returns: { result: 'REJECTED', yes_percentage: '30.12', ... }
 */
export const countReferendum = ({ votes, config }) => {
  // Input validation
  if (!Array.isArray(votes)) {
    throw new Error('votes must be an array');
  }

  if (!config || typeof config !== 'object') {
    throw new Error('config must be an object');
  }

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
    ties_detected: false, // Referendums don't have ties
  };
};
