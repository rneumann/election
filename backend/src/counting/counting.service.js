import { client } from '../database/db.js';
import { logger } from '../conf/logger/logger.js';
import { writeAuditLog } from '../audit/auditLogger.js';
import { getAlgorithm } from './algorithms/algorithm-registry.js';
import { validateElection } from './validators/election-validator.js';

// Constants
const ERROR_ELECTION_ID_REQUIRED = 'electionId must be a non-empty string';
const AUDIT_LOG_ERROR_MESSAGE = 'Audit log failed:';

/**
 * Counting Service - Orchestrates election vote counting process.
 *
 * BSI-Compliant:
 * - Uses only aggregated vote data from database VIEWs
 * - No access to individual ballots or voter identities
 * - Results stored separately from raw voting data
 * - Maintains complete audit trail (counted_by, counted_at, version)
 *
 * @module counting.service
 */

/**
 * Performs election counting and stores results in database.
 *
 * Process:
 * 1. Validate election state (ended, configured, not finalized)
 * 2. Load aggregated vote data (BSI-compliant: no voter linkage)
 * 3. Select and execute appropriate counting algorithm
 * 4. Store results with version control
 * 5. Return counting summary with tie detection status
 *
 * @async
 * @param {string} electionId - UUID of election to count
 * @param {string} userId - Username of user triggering count (for audit trail)
 * @returns {Promise<Object>} Counting result summary with properties: success (boolean), result_id (string UUID), version (number), ties_detected (boolean), counted_at (ISO timestamp), algorithm (string)
 * @throws {Error} If election not found, not ended, not configured, or already finalized
 *
 * @example
 * const result = await performCounting('abc-123', 'admin@hka.de');
 * // { success: true, result_id: 'def-456', version: 1, ties_detected: false }
 */
export const performCounting = async (electionId, userId) => {
  // Validate input
  if (!electionId || typeof electionId !== 'string') {
    throw new Error(ERROR_ELECTION_ID_REQUIRED);
  }

  if (!userId || typeof userId !== 'string') {
    throw new Error('userId must be a non-empty string (for audit trail)');
  }

  const db = await client.connect();

  try {
    await db.query('BEGIN');

    // Load election configuration
    const electionRes = await db.query(
      `SELECT id, info, election_type, counting_method, 
              seats_to_fill, votes_per_ballot, max_cumulative_votes, start, "end"
       FROM elections 
       WHERE id = $1`,
      [electionId],
    );

    if (electionRes.rows.length === 0) {
      throw new Error(`Election not found: ${electionId}`);
    }

    const election = electionRes.rows[0];

    // Validate seats_to_fill is configured
    if (!election.seats_to_fill || election.seats_to_fill < 1) {
      logger.error(
        `seats_to_fill not configured for election ${electionId}: value=${election.seats_to_fill}`,
      );
      throw new Error(
        `seats_to_fill must be configured and >= 1 for election ${electionId}. Current value: ${election.seats_to_fill}`,
      );
    }

    // Validate election is ready for counting
    await validateElection(election, db);

    // Load vote data using BSI-compliant queries
    // CRITICAL FIX: Different query strategy for referendums vs candidate-based elections
    let votesRes;

    if (election.election_type === 'referendum') {
      votesRes = await db.query(
        `SELECT 
           ec.listnum, 
           c.keyword AS firstname, 
           '' AS lastname, 
           COALESCE(SUM(bv.votes), 0) AS votes
         FROM electioncandidates ec
         JOIN candidates c ON c.id = ec.candidateid
         LEFT JOIN ballotvotes bv ON bv.election = ec.electionid AND bv.listnum = ec.listnum
         WHERE ec.electionid = $1
         GROUP BY ec.listnum, c.keyword
         ORDER BY ec.listnum`,
        [electionId],
      );
    } else {
      votesRes = await db.query(
        `SELECT listnum, firstname, lastname, votes 
         FROM counting 
         WHERE electionid = $1
         ORDER BY listnum`,
        [electionId],
      );
    }

    const votes = votesRes.rows;

    if (votes.length === 0) {
      logger.warn(`No votes found for election ${electionId}`);
      // For majority elections, no candidates means configuration error
      if (election.election_type === 'majority_vote') {
        throw new Error(
          `No candidates configured for majority election: ${electionId}. Please add candidates before counting.`,
        );
      }
      // For proportional/referendum, allow counting with no votes
    }

    logger.info(`Loaded ${votes.length} vote entries for counting`);

    // Step 3.5: Load ballot statistics for majority threshold calculation
    const statsRes = await db.query(
      `SELECT total_ballots, valid_ballots, invalid_ballots
       FROM ballot_statistics
       WHERE election = $1`,
      [electionId],
    );

    const ballotStats = statsRes.rows[0] || {
      total_ballots: 0,
      valid_ballots: 0,
      invalid_ballots: 0,
    };

    // Select appropriate counting algorithm
    const algorithm = getAlgorithm(election.counting_method);

    // Prepare configuration for algorithm
    const config = {
      seats_to_fill: election.seats_to_fill,
      max_cumulative_votes: election.max_cumulative_votes,
      total_valid_ballots: ballotStats.valid_ballots,
      ballot_statistics: ballotStats,
      counting_method: election.counting_method, // Required for conditional logic in algorithms
    };

    logger.info(
      `Executing ${election.counting_method} algorithm with config: ${JSON.stringify(config)}`,
    );

    // Execute counting algorithm (BSI: only aggregated data passed)
    const result = algorithm({ votes, config });

    logger.info(
      `Counting completed: algorithm=${result.algorithm}, ties=${result.ties_detected || false}`,
    );

    // Determine next version number for this election
    // Use SELECT FOR UPDATE on election row to prevent race conditions
    // This ensures atomic version generation when multiple counting processes run simultaneously
    await db.query(`SELECT id FROM elections WHERE id = $1 FOR UPDATE`, [electionId]);

    const versionRes = await db.query(
      `SELECT COALESCE(MAX(version), 0) + 1 AS next_version
       FROM election_results 
       WHERE election_id = $1`,
      [electionId],
    );

    const version = versionRes.rows[0].next_version;

    logger.info(`Storing result as version ${version}`);

    const isElectionTest = election.start > Date.now();

    // Store result in database (JSONB for flexibility)
    const insertRes = await db.query(
      `INSERT INTO election_results 
         (election_id, version, result_data, counted_by, test_election)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, counted_at`,
      [electionId, version, JSON.stringify(result), userId, isElectionTest],
    );

    const resultId = insertRes.rows[0].id;
    const countedAt = insertRes.rows[0].counted_at;

    await db.query('COMMIT');

    // Audit Log: Successful counting performed
    await writeAuditLog({
      actionType: 'COUNTING_PERFORMED',
      level: 'INFO',
      actorId: userId,
      actorRole: 'admin',
      targetResource: `election:${electionId}`,
      details: {
        election_info: election.info,
        election_type: election.election_type,
        counting_method: election.counting_method,
        algorithm_used: result.algorithm,
        result_id: resultId,
        version: version,
        ties_detected: result.ties_detected || false,
        is_test_election: isElectionTest,
      },
    }).catch((e) => logger.error(AUDIT_LOG_ERROR_MESSAGE, e));

    logger.info(
      `✅ Vote counting successful: election=${election.info}, version=${version}, ` +
        `result_id=${resultId}, ties=${result.ties_detected || false}`,
    );

    return {
      success: true,
      result_id: resultId,
      version,
      ties_detected: result.ties_detected || false,
      counted_at: countedAt,
      algorithm: result.algorithm,
    };
  } catch (error) {
    await db.query('ROLLBACK');
    logger.error(`Vote counting failed for election ${electionId}: ${error.message}`, {
      error: error.stack,
      userId,
    });
    // Audit Log: Failed counting
    await writeAuditLog({
      actionType: 'COUNTING_PERFORMED',
      level: 'ERROR',
      actorId: userId,
      actorRole: 'admin',
      targetResource: `election:${electionId}`,
      details: {
        error: error.message,
      },
    }).catch((e) => logger.error(AUDIT_LOG_ERROR_MESSAGE, e));
    throw error;
  } finally {
    db.release();
  }
};

/**
 * Retrieves stored counting results for an election.
 *
 * @async
 * @param {string} electionId - UUID of election
 * @param {number} [version=null] - Specific version to retrieve (null = latest)
 * @returns {Promise<Object>} Stored election result with properties: id (UUID), election_id (UUID), version (number), result_data (JSONB from algorithm), is_final (boolean), counted_by (username), counted_at (ISO timestamp)
 * @throws {Error} If no results found for election/version
 *
 * @example
 * // Get latest result
 * const latest = await getResults('abc-123');
 *
 * // Get specific version
 * const v1 = await getResults('abc-123', 1);
 */
export const getResults = async (electionId, version = null) => {
  // Validate input
  if (!electionId || typeof electionId !== 'string') {
    throw new Error(ERROR_ELECTION_ID_REQUIRED);
  }

  if (version !== null && (!Number.isInteger(version) || version < 1)) {
    throw new Error('version must be a positive integer or null');
  }

  let query;
  let params;

  if (version !== null) {
    // Get specific version
    query = `
      SELECT id, election_id, version, result_data, is_final, counted_by, counted_at
      FROM election_results 
      WHERE election_id = $1 AND version = $2
    `;
    params = [electionId, version];

    logger.info(`Retrieving result: election=${electionId}, version=${version}`);
  } else {
    // Get latest version
    query = `
      SELECT id, election_id, version, result_data, is_final, counted_by, counted_at
      FROM election_results 
      WHERE election_id = $1 
      ORDER BY version DESC 
      LIMIT 1
    `;
    params = [electionId];

    logger.info(`Retrieving latest result for election=${electionId}`);
  }

  const result = await client.query(query, params);

  if (result.rows.length === 0) {
    const errorMsg = version
      ? `No results found for election ${electionId} version ${version}`
      : `No results found for election ${electionId}`;
    throw new Error(errorMsg);
  }

  const resultData = result.rows[0];

  logger.info(
    `Result retrieved: election=${electionId}, version=${resultData.version}, ` +
      `final=${resultData.is_final}`,
  );

  return resultData;
};

/**
 * Finalizes election results, preventing further counting.
 *
 * Once finalized:
 * - No further counting allowed for this election
 * - Result becomes official and immutable
 * - Used after manual tie-break resolution or committee approval
 *
 * @async
 * @param {string} electionId - UUID of election
 * @param {number} version - Version to finalize
 * @param {string} userId - User finalizing (for audit trail)
 * @returns {Promise<Object>} Success confirmation with property: success (boolean)
 * @throws {Error} If election already finalized or version not found
 *
 * @example
 * await finalizeResults('abc-123', 1, 'admin@hka.de');
 * // { success: true }
 */
export const finalizeResults = async (electionId, version, userId) => {
  // Validate input
  if (!electionId || typeof electionId !== 'string') {
    throw new Error(ERROR_ELECTION_ID_REQUIRED);
  }

  if (!Number.isInteger(version) || version < 1) {
    throw new Error('version must be a positive integer');
  }

  if (!userId || typeof userId !== 'string') {
    throw new Error('userId must be a non-empty string (for audit trail)');
  }

  const db = await client.connect();

  try {
    await db.query('BEGIN');

    logger.info(`Finalizing results: election=${electionId}, version=${version}, user=${userId}`);

    // Check if already finalized (prevents double-finalization)
    const checkRes = await db.query(
      `SELECT id, version, counted_at 
       FROM election_results 
       WHERE election_id = $1 AND is_final = TRUE`,
      [electionId],
    );

    if (checkRes.rows.length > 0) {
      const existing = checkRes.rows[0];
      throw new Error(
        `Election already has finalized results: version ${existing.version} ` +
          `(finalized at ${existing.counted_at})`,
      );
    }

    // Finalize the specified version
    const updateRes = await db.query(
      `UPDATE election_results 
       SET is_final = TRUE 
       WHERE election_id = $1 AND version = $2
       RETURNING id, counted_at`,
      [electionId, version],
    );

    if (updateRes.rows.length === 0) {
      throw new Error(`Result version ${version} not found for election ${electionId}`);
    }

    await db.query('COMMIT');

    // Audit Log: Results finalized
    await writeAuditLog({
      actionType: 'COUNTING_FINALIZED',
      level: 'INFO',
      actorId: userId,
      actorRole: 'admin',
      targetResource: `election:${electionId}`,
      details: {
        version: version,
        result_id: updateRes.rows[0].id,
        counted_at: updateRes.rows[0].counted_at,
      },
    }).catch((e) => logger.error(AUDIT_LOG_ERROR_MESSAGE, e));

    logger.info(`✅ Results finalized: election=${electionId}, version=${version}, user=${userId}`);

    return { success: true };
  } catch (error) {
    await db.query('ROLLBACK');
    logger.error(
      `Result finalization failed: election=${electionId}, version=${version}: ${error.message}`,
      { error: error.stack, userId },
    );

    // Audit Log: Failed finalization
    await writeAuditLog({
      actionType: 'COUNTING_FINALIZED',
      level: 'ERROR',
      actorId: userId,
      actorRole: 'admin',
      targetResource: `election:${electionId}`,
      details: {
        version: version,
        error: error.message,
      },
    }).catch((e) => logger.error(AUDIT_LOG_ERROR_MESSAGE, e));

    throw error;
  } finally {
    db.release();
  }
};
