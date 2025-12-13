import crypto from 'crypto';
import { readSecret } from './secret-reader.js';

/**
 * Generates a SHA256 hash for a given ballot.
 * The hash is a combination of the previous hash (if given),
 * the sorted list of votes (in the format listnum:votes),
 * and the election ID.
 * If the ballot is invalid, the hash is a combination of
 * the previous hash (if given) and the election ID, with the string
 * "invalid" in between.
 *
 * @param {string} electionId - The ID of the election the ballot is for.
 * @param {object[]} voteDecision - An array of objects containing the list number and votes for each candidate.
 * @param {boolean} valid - Whether the ballot is valid or not.
 * @param {?string} previousHash - The hash of the previous ballot, if any.
 * @returns {string} The generated hash.
 */
export const generateBallotHashes = ({ electionId, voteDecision, valid, previousHash }) => {
  const BALLOT_SECRET = readSecret('BALLOT_SECRET');
  if (!BALLOT_SECRET) {
    throw new Error('BALLOT_SECRET is not defined in environment variables');
  }
  if (valid === false) {
    const combined = previousHash
      ? `${previousHash}|invalid|${electionId}|${BALLOT_SECRET}`
      : `invalid|${electionId}|${BALLOT_SECRET}`;
    return crypto.createHash('sha256').update(combined).digest('hex');
  }
  const sortedVotes = [...voteDecision]
    .sort((a, b) => a.listnum - b.listnum)
    .map((v) => `${v.listnum}:${v.votes}`)
    .join('|');

  const combined = previousHash
    ? `${previousHash}|${sortedVotes}|${electionId}|${BALLOT_SECRET}`
    : `${sortedVotes}|${electionId}|${BALLOT_SECRET}`;
  return crypto.createHash('sha256').update(combined).digest('hex');
};
