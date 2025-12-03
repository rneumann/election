import { logger } from '../../conf/logger/logger.js';

/**
 * Validates election readiness for counting.
 * Ensures BSI compliance: No counting before election end.
 *
 * @module election-validator
 */

/**
 * Validates that an election is ready to be counted.
 *
 * Checks:
 * 1. Election has ended (BSI requirement)
 * 2. election_type is configured
 * 3. counting_method is configured
 * 4. Results not already finalized (allows re-counting if not final)
 *
 * @async
 * @param {Object} election - Election object from database
 * @param {string} election.id - Election UUID
 * @param {Date|string} election.end - Election end timestamp
 * @param {string} election.election_type - Type of election
 * @param {string} election.counting_method - Counting algorithm to use
 * @param {Object} db - Database client connection
 * @returns {Promise<boolean>} True if validation passes
 * @throws {Error} If any validation check fails
 *
 * @example
 * const election = await getElection(electionId);
 * await validateElection(election, db); // Throws if invalid
 */
export const validateElection = async (election, db) => {
  // Check 1: Election must have ended (BSI requirement)
  const now = new Date();
  const endDate = new Date(election.end);

  if (endDate > now) {
    const timeRemaining = Math.ceil((endDate - now) / (1000 * 60)); // Minutes
    throw new Error(
      `Election has not ended yet. Ends at ${endDate.toISOString()} (${timeRemaining} minutes remaining)`,
    );
  }

  // Check 2: election_type must be configured
  if (!election.election_type) {
    throw new Error(
      'Missing election_type configuration. Cannot determine counting rules. ' +
        'Please configure election_type in Excel import (Column H).',
    );
  }

  // Check 3: counting_method must be configured
  if (!election.counting_method) {
    throw new Error(
      'Missing counting_method configuration. Cannot proceed with counting. ' +
        'Please configure counting_method in Excel import (Column I).',
    );
  }

  // Check 4: Results must not be finalized yet (allows re-counting)
  const finalRes = await db.query(
    `SELECT id, version, counted_at 
     FROM election_results 
     WHERE election_id = $1 AND is_final = TRUE`,
    [election.id],
  );

  if (finalRes.rows.length > 0) {
    const finalResult = finalRes.rows[0];
    throw new Error(
      `Election results already finalized (version ${finalResult.version}, ` +
        `finalized at ${finalResult.counted_at}). No further counting allowed.`,
    );
  }

  logger.info(
    `✅ Validation passed for election ${election.id} (${election.info}): ` +
      `type=${election.election_type}, method=${election.counting_method}`,
  );

  return true;
};
