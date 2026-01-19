import { client } from '../database/db.js';
import { logger } from '../conf/logger/logger.js';

/**
 * Service zur automatisierten Prüfung der kryptografischen Ketten (Blockchain-Prinzip)
 * Überprüft Datensicherheit und Unverfälschtheit von Audit Logs und Stimmzetteln
 */
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
      
      // Alle Logs aufsteigend nach ID laden
      const { rows } = await db.query(
        `SELECT 
          id, 
          prev_hash, 
          entry_hash, 
          action_type, 
          timestamp 
        FROM audit_log 
        ORDER BY id ASC`
      );

      if (rows.length <= 1) {
        return {
          success: true,
          totalChecked: rows.length,
          errors: [],
          message: 'Zu wenige Einträge für eine Kettenprüfung.',
          timestamp: new Date().toISOString()
        };
      }

      let errors = [];
      
      // Überprüfe die gesamte Kette
      for (let i = 1; i < rows.length; i++) {
        const current = rows[i];
        const previous = rows[i - 1];

        // Der prev_hash des aktuellen Eintrags MUSS der entry_hash des vorherigen sein
        if (current.prev_hash !== previous.entry_hash) {
          errors.push({
            position: i,
            currentId: current.id,
            currentAction: current.action_type,
            currentTimestamp: current.timestamp,
            expectedHash: previous.entry_hash,
            foundHash: current.prev_hash,
            message: `Kettenubruch bei ID ${current.id}: Hashes stimmen nicht überein`
          });
        }
      }

      const result = {
        success: errors.length === 0,
        totalChecked: rows.length,
        errors: errors,
        timestamp: new Date().toISOString(),
        message: errors.length === 0 
          ? `✓ Audit Log Chain vollständig intakt (${rows.length} Einträge geprüft)`
          : `✗ ${errors.length} Fehler in der Audit Log Chain gefunden`
      };

      logger.info(result.message);
      return result;
    } catch (err) {
      logger.error('Fehler bei Audit Log Chain Prüfung:', err);
      return {
        success: false,
        totalChecked: 0,
        errors: [{ message: err.message }],
        timestamp: new Date().toISOString()
      };
    } finally {
      db.release();
    }
  },

  /**
   * Prüft die Integrität der Stimmzettel einer spezifischen Wahl
   * Der previous_ballot_hash jedes Zettels muss der ballot_hash des vorherigen sein
   * @param {string} electionId - UUID der Wahl
   * @returns {Promise<{success: boolean, totalChecked: number, errors: string[], electionInfo: object, timestamp: string}>}
   */
  verifyBallotChain: async (electionId) => {
    const db = await client.connect();
    try {
      logger.info(`Starte Prüfung der Stimmzettel Chain für Wahl ${electionId}...`);

      // Lade Wahlinformationen
      const electionQuery = await db.query(
        'SELECT id, info, election_type FROM elections WHERE id = $1',
        [electionId]
      );

      if (electionQuery.rows.length === 0) {
        return {
          success: false,
          totalChecked: 0,
          errors: [{ message: 'Wahl nicht gefunden' }],
          timestamp: new Date().toISOString()
        };
      }

      const election = electionQuery.rows[0];

      // Lade alle Stimmzettel für diese Wahl
      const { rows } = await db.query(
        `SELECT 
          id, 
          serial_id, 
          ballot_hash, 
          previous_ballot_hash 
        FROM ballots 
        WHERE election = $1 
        ORDER BY serial_id ASC`,
        [electionId]
      );

      if (rows.length <= 1) {
        return {
          success: true,
          totalChecked: rows.length,
          errors: [],
          electionInfo: { id: election.id, name: election.info, type: election.election_type },
          message: 'Keine oder zu wenige Stimmzettel vorhanden.',
          timestamp: new Date().toISOString()
        };
      }

      let errors = [];

      // Überprüfe die gesamte Stimmzettel-Kette
      for (let i = 1; i < rows.length; i++) {
        const current = rows[i];
        const previous = rows[i - 1];

        // Der previous_ballot_hash des aktuellen Zettels MUSS der ballot_hash des vorherigen sein
        if (current.previous_ballot_hash !== previous.ballot_hash) {
          errors.push({
            position: i,
            currentSerialId: current.serial_id,
            currentId: current.id,
            expectedHash: previous.ballot_hash,
            foundHash: current.previous_ballot_hash,
            message: `Manipulation erkannt bei Stimmzettel #${current.serial_id}: Hashes stimmen nicht überein`
          });
        }
      }

      const result = {
        success: errors.length === 0,
        totalChecked: rows.length,
        errors: errors,
        electionInfo: {
          id: election.id,
          name: election.info,
          type: election.election_type
        },
        timestamp: new Date().toISOString(),
        message: errors.length === 0
          ? `✓ Stimmzettel Chain für "${election.info}" vollständig intakt (${rows.length} Stimmzettel geprüft)`
          : `✗ ${errors.length} Fehler in der Stimmzettel Chain gefunden`
      };

      logger.info(result.message);
      return result;
    } catch (err) {
      logger.error(`Fehler bei Stimmzettel Chain Prüfung für Wahl ${electionId}:`, err);
      return {
        success: false,
        totalChecked: 0,
        errors: [{ message: err.message }],
        timestamp: new Date().toISOString()
      };
    } finally {
      db.release();
    }
  },

  /**
   * Prüft ALLE Wahlen und deren Stimmzettel-Ketten
   * @returns {Promise<{success: boolean, totalElections: number, results: array, timestamp: string}>}
   */
  verifyAllBallotChains: async () => {
    const db = await client.connect();
    try {
      logger.info('Starte Prüfung aller Stimmzettel Chains...');

      // Lade alle Wahlen
      const { rows: elections } = await db.query(
        'SELECT id, info, election_type FROM elections ORDER BY start DESC'
      );

      if (elections.length === 0) {
        return {
          success: true,
          totalElections: 0,
          results: [],
          message: 'Keine Wahlen vorhanden.',
          timestamp: new Date().toISOString()
        };
      }

      // Prüfe jede Wahl
      const results = [];
      let totalErrors = 0;

      for (const election of elections) {
        const result = await integrityService.verifyBallotChain(election.id);
        results.push(result);
        totalErrors += result.errors.length;
      }

      return {
        success: totalErrors === 0,
        totalElections: elections.length,
        results: results,
        totalErrors: totalErrors,
        timestamp: new Date().toISOString(),
        message: totalErrors === 0
          ? `✓ Alle ${elections.length} Wahlen sind intakt`
          : `✗ ${totalErrors} Fehler in ${elections.length} Wahlen gefunden`
      };
    } catch (err) {
      logger.error('Fehler bei Prüfung aller Stimmzettel Chains:', err);
      return {
        success: false,
        totalElections: 0,
        results: [],
        errors: [{ message: err.message }],
        timestamp: new Date().toISOString()
      };
    } finally {
      db.release();
    }
  }
};
