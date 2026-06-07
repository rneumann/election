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
    case 'test':
      conditions.push('e.test_election_active = true');
      break;
    case 'test_stopped':
      // Gestoppte Testwahlen: Wahl noch nicht beendet, Testmodus deaktiviert, aber bereits Stimmen vorhanden
      conditions.push(
        'e.test_election_active = false AND e."end" > now() AND EXISTS (SELECT 1 FROM ballots b WHERE b.election = e.id)',
      );
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
      COALESCE(b.ballots, 0)   AS ballots,

      er.id AS result_id,
      er.version AS result_version,
      er.is_final,
      er.counted_at AS result_counted_at,
      er.counted_by,
      er.result_algorithm

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

    LEFT JOIN (
      SELECT DISTINCT ON (election_id)
        election_id,
        id,
        version,
        is_final,
        counted_at,
        counted_by,
        result_data->>'algorithm' AS result_algorithm
      FROM election_results
      WHERE is_final = true
      ORDER BY election_id, version DESC
    ) er ON er.election_id = e.id

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
 * Finds all elections where the real election has started (now >= start)
 * but test_election_active is still true, then automatically deactivates
 * the test mode and deletes all test ballot data.
 * Safe to call on every relevant request — exits quickly if nothing to do.
 */
export const cleanupExpiredTestElections = async () => {
  try {
    const { rows } = await client.query(
      `SELECT id, info FROM elections
       WHERE test_election_active = true AND start <= now()`,
    );

    if (rows.length === 0) return;

    for (const election of rows) {
      logger.warn(
        `Auto-cleanup: Testwahl für "${election.info}" (${election.id}) wird beendet, da die Wahl gestartet hat.`,
      );
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM election_results WHERE election_id = $1', [election.id]);
        await client.query('UPDATE votingnotes SET voted = false WHERE electionId = $1', [election.id]);
        await client.query('DELETE FROM ballotvotes WHERE election = $1', [election.id]);
        await client.query('DELETE FROM ballots WHERE election = $1', [election.id]);
        await client.query('UPDATE elections SET test_election_active = false WHERE id = $1', [election.id]);
        await client.query('COMMIT');

        writeAuditLog({
          actionType: 'AUTO_CLEANUP_TEST_ELECTION',
          level: 'WARN',
          actorRole: 'SYSTEM',
          details: {
            electionId: election.id,
            info: `Testwahl automatisch beendet und Daten gelöscht: "${election.info}"`,
          },
        }).catch((e) => logger.error(e));
      } catch (err) {
        await client.query('ROLLBACK');
        logger.error(`Auto-cleanup fehlgeschlagen für Wahl ${election.id}: ${err.message}`);
      }
    }
  } catch (err) {
    logger.error(`cleanupExpiredTestElections fehlgeschlagen: ${err.message}`);
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
    logger.debug(`Failed to toogle test election for ${electionId}: ${error.message}`);
    logger.error(`Failed to toogle test election for ${electionId}`);
    writeAuditLog({
      actionType: 'TOGGLE_TEST_ELECTION',
      level: 'ERROR',
      actorRole: 'ADMIN',
      details: {
        info: `Failed to toogle test election for ${electionId}: ${error.message}`,
      },
    }).catch((e) => {
      logger.error(e);
    });
    throw new Error(`Failed to toogle test election for ${electionId}`);
  }
};

export const deleteAllData = async (actorId = 'system', actorRole = 'admin') => {
  try {
    await client.query('BEGIN');

    await client.query('DELETE FROM ballotvotes');
    await client.query('DELETE FROM ballots');
    await client.query('DELETE FROM election_results');
    await client.query('DELETE FROM votingnotes');
    await client.query('DELETE FROM electioncandidates');
    await client.query('DELETE FROM candidate_information');
    await client.query('DELETE FROM elections');
    await client.query('DELETE FROM candidates');
    await client.query('DELETE FROM voters');
    await client.query('DELETE FROM candidate_options');
    await client.query('DELETE FROM audit_log');

    await client.query('COMMIT');

    // Audit Log: Successful deletion of ALL data (neu geschrieben nach dem Löschen)
    await writeAuditLog({
      actionType: 'DELETE_ALL_DATA',
      level: 'CRITICAL',
      actorId: actorId,
      actorRole: actorRole,
      details: {
        tables_cleared: [
          'ballotvotes',
          'ballots',
          'election_results',
          'votingnotes',
          'electioncandidates',
          'candidate_information',
          'elections',
          'candidates',
          'voters',
          'candidate_options',
          'audit_log',
        ],
        timestamp: new Date().toISOString(),
      },
    }).catch((e) => logger.error('Audit log failed:', e));

    logger.info(`All data deleted successfully by ${actorId}`);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to delete all data from the database.');

    // Audit Log: Failed deletion of ALL data
    await writeAuditLog({
      actionType: 'DELETE_ALL_DATA',
      level: 'ERROR',
      actorId: actorId,
      actorRole: actorRole,
      details: {
        error: error.message,
        attempted_operation: 'delete_all_database_data',
      },
    }).catch((e) => logger.error('Audit log failed:', e));

    throw new Error(DATABASE_QUERY_ERROR);
  }
};

export const deleteAllElectionData = async (
  electionId,
  actorId = 'system',
  actorRole = 'admin',
) => {
  try {
    await client.query('BEGIN');

    await client.query('DELETE FROM ballotvotes WHERE election = $1', [electionId]);
    await client.query('DELETE FROM ballots WHERE election = $1', [electionId]);
    await client.query('DELETE FROM election_results WHERE election_id = $1', [electionId]);
    await client.query('DELETE FROM votingnotes WHERE electionId = $1', [electionId]);
    await client.query('DELETE FROM electioncandidates WHERE electionId = $1', [electionId]);
    await client.query('DELETE FROM elections WHERE id = $1', [electionId]);

    // Kandidaten entfernen, die nach dem Löschen der Wahl in keiner weiteren Wahl mehr stehen
    await client.query(
      'DELETE FROM candidates WHERE id NOT IN (SELECT candidateId FROM electioncandidates)',
    );

    // Wähler entfernen, die nach dem Löschen der Wahl in keiner weiteren Wahl mehr eingetragen sind
    await client.query(
      'DELETE FROM voters WHERE id NOT IN (SELECT DISTINCT voterId FROM votingnotes)',
    );

    await client.query('COMMIT');

    // Audit Log: Successful deletion of election data
    await writeAuditLog({
      actionType: 'DELETE_ELECTION_DATA',
      level: 'WARN',
      actorId: actorId,
      actorRole: actorRole,
      targetResource: `election:${electionId}`,
      details: {
        election_id: electionId,
        tables_cleared: [
          'ballotvotes',
          'ballots',
          'election_results',
          'votingnotes',
          'electioncandidates',
          'elections',
          'candidates (wahlspezifische)',
          'voters (wahlspezifische)',
        ],
        timestamp: new Date().toISOString(),
      },
    }).catch((e) => logger.error('Audit log failed:', e));

    logger.info(`Election data deleted successfully for election ${electionId} by ${actorId}`);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to delete all election data from the database.');

    // Audit Log: Failed deletion of election data
    await writeAuditLog({
      actionType: 'DELETE_ELECTION_DATA',
      level: 'ERROR',
      actorId: actorId,
      actorRole: actorRole,
      targetResource: `election:${electionId}`,
      details: {
        election_id: electionId,
        error: error.message,
      },
    }).catch((e) => logger.error('Audit log failed:', e));

    throw new Error(DATABASE_QUERY_ERROR);
  }
};
