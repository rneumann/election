import { writeAuditLog } from '../audit/auditLogger.js';
import { logger } from '../conf/logger/logger.js';
import { client } from '../database/db.js';

/**
 * Retrieves all elections that are active or will be active in the future.
 * @param status
 * @returns {Promise<Array>} - An array of election objects.
 */
export const getElectionsForAdmin = async (status) => {
  const conditions = ['1=1'];

  /* eslint-disable*/
  switch (status) {
    case 'active':
      conditions.push('e.start <= now() AND e."end" >= now()');
      break;
    case 'finished':
      conditions.push('e."end" < now()');
      break;
    case 'future':
      conditions.push('e.start > now()');
      break;
  }

  const sql = `
    SELECT
      e.id,
      e.info,
      e.description,
      e.seats_to_fill,
      e.votes_per_ballot,
      e.test_election_active,
      e.start,
      e."end",

      COALESCE(c.candidates, 0) AS candidates,
      COALESCE(v.voters, 0)     AS voters,
      COALESCE(b.ballots, 0)   AS ballots

    FROM elections e

    LEFT JOIN (
      SELECT
        electionId,
        COUNT(candidateId) AS candidates
      FROM electioncandidates
      GROUP BY electionId
    ) c ON c.electionId = e.id

    LEFT JOIN (
      SELECT
        electionId,
        COUNT(DISTINCT voterId) AS voters
      FROM votingnotes
      GROUP BY electionId
    ) v ON v.electionId = e.id

    LEFT JOIN (
      SELECT
        election,
        COUNT(*) AS ballots
      FROM ballots
      GROUP BY election
    ) b ON b.election = e.id

    WHERE
      ${conditions.join(' AND ')}

    ORDER BY e.start DESC;
  `;

  try {
    logger.debug(`getElectionsForAdmin with sql: ${sql}`);
    const res = await client.query(sql);
    logger.debug(`getElectionsForAdmin res: ${JSON.stringify(res.rows)}`);
    return res.rows || [];
  } catch (err) {
    logger.error('Error while retrieving elections');
    logger.debug(err.stack);
    throw new Error('Database query failed');
  }
};

/**
 * Resets all voting data for an election.
 * This function is intended to be used for test elections only.
 * It will delete all results, voting notes and ballots associated with the election.
 * It will also reset the listvotes counter for the election.
 * @param {string} electionId - UUID of election to reset
 * @throws {Error} If election is not marked as a test election or if election with given ID is not found.
 * @returns {Promise<void>}
 */
export const resetElectionData = async (electionId) => {
  try {
    await client.query('BEGIN');

    const checkResult = await client.query('SELECT start FROM elections WHERE id = $1', [
      electionId,
    ]);

    if (checkResult.rows.length === 0) {
      throw new Error(`Election with ID ${electionId} not found.`);
    }
    if (checkResult.rows[0].start <= new Date()) {
      throw new Error(`Election with ID ${electionId} has already started.`);
    }
    await client.query('DELETE FROM election_results WHERE election_id = $1', [electionId]);
    await client.query('UPDATE votingnotes SET voted = false WHERE electionId = $1', [electionId]);
    await client.query('DELETE FROM ballotvotes WHERE election = $1', [electionId]);
    await client.query('DELETE FROM ballots WHERE election = $1', [electionId]);

    await client.query('UPDATE elections SET test_election_active = false WHERE id = $1', [
      electionId,
    ]);

    await client.query('COMMIT');
    writeAuditLog({
      actionType: 'RESET_ELECTION_DATA',
      level: 'INFO',
      actorRole: 'ADMIN',
      details: {
        info: `Reset all voting data for test election ID: ${electionId}`,
      },
    }).catch((e) => logger.error(e));
    logger.info(`Successfully reset all voting data for election ID: ${electionId}`);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.debug(`Failed to reset election data for ${electionId}: ${error.message}`);
    logger.error(`Failed to reset election data for ${electionId}`);
    writeAuditLog({
      actionType: 'RESET_ELECTION_DATA',
      level: 'ERROR',
      actorRole: 'ADMIN',
      details: {
        info: `Failed to reset election data for ${electionId}: ${error.message}`,
      },
    }).catch((e) => logger.error(e));
    throw new Error(`Failed to reset election data for ${electionId}`);
  }
};

/**
 * Toggles the test election status of an election.
 * This function is intended to be used by administrators to mark an election as a test election or not.
 * It will toggle the test_election_active column in the elections table for the given election ID.
 * @param {string} electionId - UUID of election to toggle test election status
 * @throws {Error} If election with given ID is not found or if query fails
 * @returns {Promise<void>}
 */
export const controlTestElection = async (electionId) => {
  try {
    const checkResult = await client.query(
      'SELECT start, test_election_active FROM elections WHERE id = $1',
      [electionId],
    );

    if (checkResult.rows.length === 0) {
      throw new Error(`Election with ID ${electionId} not found.`);
    }

    if (checkResult.rows[0].start <= new Date()) {
      throw new Error(`Election with ID ${electionId} has already started.`);
    }
    logger.debug(`Toggling test election status for election ID: ${electionId}`);
    await client.query(
      'UPDATE elections SET test_election_active = NOT test_election_active WHERE id = $1',
      [electionId],
    );
    writeAuditLog({
      actionType: 'TOGGLE_TEST_ELECTION',
      level: 'INFO',
      actorRole: 'ADMIN',
      details: {
        info: `Toggled test election status for election ID: ${electionId} from ${checkResult.rows[0].test_election_active} to ${!checkResult.rows[0].test_election_active}`,
      },
    }).catch((e) => logger.error(e));
  } catch (error) {
    logger.debug(`Failed to reset election data for ${electionId}: ${error.message}`);
    logger.error(`Failed to reset election data for ${electionId}`);
    writeAuditLog({
      actionType: 'TOGGLE_TEST_ELECTION',
      level: 'ERROR',
      actorRole: 'ADMIN',
      details: {
        info: `Failed to reset election data for ${electionId}: ${error.message}`,
      },
    }).catch((e) => {
      logger.error(e);
    });
    throw new Error(`Failed to reset election data for ${electionId}`);
  }
};
