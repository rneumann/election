import { client } from '../database/db.js';
import { logger } from '../conf/logger/logger.js';

/**
 * Prüft die Integrität jedes einzelnen Stimmzettels einer Wahl:
 * - serial_ids sind lückenlos (1..N)
 * - gültige Stimmzettel haben mindestens einen Stimmeneintrag
 * - ungültige Stimmzettel haben keine Stimmeneinträge
 * @param {string} electionId
 * @param {object} db - bestehende DB-Verbindung
 */
const verifyBallotIntegrity = async (electionId, db) => {
  const { rows: ballots } = await db.query(
    `SELECT b.id, b.serial_id, b.valid,
            COUNT(bv.ballot) AS vote_count
     FROM ballots b
     LEFT JOIN ballotvotes bv ON bv.ballot = b.id
     WHERE b.election = $1
     GROUP BY b.id, b.serial_id, b.valid
     ORDER BY b.serial_id ASC`,
    [electionId],
  );

  const errors = [];

  for (let i = 0; i < ballots.length; i++) {
    // eslint-disable-next-line security/detect-object-injection
    const b = ballots[i];
    const expectedSerial = i + 1;
    const voteCount = Number(b.vote_count);

    if (b.serial_id !== expectedSerial) {
      errors.push({
        ballotId: b.id,
        serialId: b.serial_id,
        message: `Lücke in serial_id: erwartet ${expectedSerial}, gefunden ${b.serial_id}`,
      });
    }
    if (b.valid && voteCount === 0) {
      errors.push({
        ballotId: b.id,
        serialId: b.serial_id,
        message: `Stimmzettel #${b.serial_id} ist gültig, hat aber keine Stimmen`,
      });
    }
    if (!b.valid && voteCount > 0) {
      errors.push({
        ballotId: b.id,
        serialId: b.serial_id,
        message: `Stimmzettel #${b.serial_id} ist ungültig, hat aber ${voteCount} Stimme(n)`,
      });
    }
  }

  return {
    success: errors.length === 0,
    totalBallots: ballots.length,
    errors,
    message:
      errors.length === 0
        ? `✓ Alle ${ballots.length} Stimmzettel sind integer`
        : `✗ ${errors.length} Auffälligkeit(en) bei ${ballots.length} Stimmzetteln`,
    timestamp: new Date().toISOString(),
  };
};

export const integrityService = {
  /**
   * Prüft die gesamte Kette der Audit Logs auf Konsistenz
   * Der prev_hash jedes Eintrags muss der entry_hash des vorherigen sein
   * @returns {Promise<{success: boolean, totalChecked: number, errors: string[], timestamp: string}>}
   */
  verifyAuditLogChain: async () => {
    const db = await client.connect();
    try {
      logger.info('Starte Prüfung der Audit Log Chain...');

      const { rows } = await db.query(
        `SELECT
          id,
          prev_hash,
          entry_hash,
          action_type,
          timestamp
        FROM audit_log
        ORDER BY id ASC`,
      );

      if (rows.length <= 1) {
        return {
          success: true,
          totalChecked: rows.length,
          errors: [],
          message: 'Zu wenige Einträge für eine Kettenprüfung.',
          timestamp: new Date().toISOString(),
        };
      }

      let errors = [];

      for (let i = 1; i < rows.length; i++) {
        // eslint-disable-next-line security/detect-object-injection
        const current = rows[i];
        const previous = rows[i - 1];

        if (current.prev_hash !== previous.entry_hash) {
          errors.push({
            position: i,
            currentId: current.id,
            currentAction: current.action_type,
            currentTimestamp: current.timestamp,
            expectedHash: previous.entry_hash,
            foundHash: current.prev_hash,
            message: `Kettenbruch bei ID ${current.id}: Hashes stimmen nicht überein`,
          });
        }
      }

      const result = {
        success: errors.length === 0,
        totalChecked: rows.length,
        errors: errors,
        timestamp: new Date().toISOString(),
        message:
          errors.length === 0
            ? `✓ Audit Log Chain vollständig intakt (${rows.length} Einträge geprüft)`
            : `✗ ${errors.length} Fehler in der Audit Log Chain gefunden`,
      };

      logger.info(result.message);
      return result;
    } catch (err) {
      logger.error('Fehler bei Audit Log Chain Prüfung:', err);
      return {
        success: false,
        totalChecked: 0,
        errors: [{ message: err.message }],
        timestamp: new Date().toISOString(),
      };
    } finally {
      db.release();
    }
  },

  /**
   * Prüft die Integrität jedes einzelnen Stimmzettels einer Wahl
   * @param {string} electionId
   */
  verifyBallotIntegrity: async (electionId) => {
    const db = await client.connect();
    try {
      return await verifyBallotIntegrity(electionId, db);
    } catch (err) {
      logger.error(`Fehler bei Ballot-Integritätsprüfung für ${electionId}:`, err);
      return {
        success: false,
        totalBallots: 0,
        errors: [{ message: err.message }],
        timestamp: new Date().toISOString(),
      };
    } finally {
      db.release();
    }
  },

  /**
   * Prüft alle Wahlen auf Ballot-Integrität
   */
  verifyAllBallotIntegrity: async () => {
    const db = await client.connect();
    try {
      const { rows: elections } = await db.query(
        `SELECT id, info FROM elections ORDER BY start ASC`,
      );

      const results = [];
      for (const election of elections) {
        const result = await verifyBallotIntegrity(election.id, db);
        results.push({ ...result, electionInfo: { id: election.id, name: election.info } });
      }

      const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
      return {
        success: totalErrors === 0,
        totalElections: elections.length,
        totalBallots: results.reduce((sum, r) => sum + r.totalBallots, 0),
        results,
        message:
          totalErrors === 0
            ? `✓ Alle Stimmzettel aller ${elections.length} Wahlen sind integer`
            : `✗ ${totalErrors} Auffälligkeit(en) in ${elections.length} Wahlen`,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      logger.error('Fehler bei Gesamt-Ballot-Integritätsprüfung:', err);
      return {
        success: false,
        totalElections: 0,
        totalBallots: 0,
        results: [],
        errors: [{ message: err.message }],
        timestamp: new Date().toISOString(),
      };
    } finally {
      db.release();
    }
  },
};
