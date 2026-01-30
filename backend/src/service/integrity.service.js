import { client } from '../database/db.js';
import { logger } from '../conf/logger/logger.js';
import { generateBallotHashes } from '../security/generate-ballot-hashes.js';

/**
 * Service zur automatisierten Prüfung der kryptografischen Ketten (Blockchain-Prinzip)
 * Überprüft Datensicherheit und Unverfälschtheit von Audit Logs und Stimmzetteln
 *
 * WICHTIG: Die Stimmzettel-Prüfung verwendet Re-Hashing mit BALLOT_SECRET,
 * um auch manipulierte Hashes zu erkennen (nicht nur Chain-Vergleich).
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

      // Überprüfe die gesamte Kette
      for (let i = 1; i < rows.length; i++) {
        // eslint-disable-next-line security/detect-object-injection
        const current = rows[i];
        // eslint-disable-next-line security/detect-object-injection
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
            message: `Kettenubruch bei ID ${current.id}: Hashes stimmen nicht überein`,
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
   * Prüft die Integrität der Stimmzettel einer spezifischen Wahl mittels RE-HASHING.
   * Berechnet den Hash für jeden Stimmzettel neu aus den Originaldaten + BALLOT_SECRET.
   * Dies erkennt auch Manipulationen, bei denen ein Angreifer versucht hat, die Hashes anzupassen.
   * @param {string} electionId - UUID der Wahl
   * @returns {Promise<{success: boolean, totalChecked: number, verifiedBallots: number, errors: array, electionInfo: object, timestamp: string}>}
   */
  verifyBallotChain: async (electionId) => {
    const db = await client.connect();
    try {
      logger.info(`Starte RE-HASH Prüfung der Stimmzettel für Wahl ${electionId}...`);

      // Lade Wahlinformationen
      const electionQuery = await db.query(
        'SELECT id, info, election_type FROM elections WHERE id = $1',
        [electionId],
      );

      if (electionQuery.rows.length === 0) {
        return {
          success: false,
          totalChecked: 0,
          verifiedBallots: 0,
          errors: [{ message: 'Wahl nicht gefunden', type: 'ELECTION_NOT_FOUND' }],
          timestamp: new Date().toISOString(),
        };
      }

      const election = electionQuery.rows[0];

      // Lade alle Stimmzettel für diese Wahl
      const { rows: ballots } = await db.query(
        `SELECT id, serial_id, ballot_hash, previous_ballot_hash, valid
         FROM ballots 
         WHERE election = $1 
         ORDER BY serial_id ASC`,
        [electionId],
      );

      if (ballots.length === 0) {
        return {
          success: true,
          totalChecked: 0,
          verifiedBallots: 0,
          errors: [],
          electionInfo: { id: election.id, name: election.info, type: election.election_type },
          message: 'Keine Stimmzettel vorhanden.',
          timestamp: new Date().toISOString(),
        };
      }

      const errors = [];
      let verifiedBallots = 0;

      // Prüfe jeden Stimmzettel durch Re-Hashing
      for (let i = 0; i < ballots.length; i++) {
        // eslint-disable-next-line security/detect-object-injection
        const current = ballots[i];
        // eslint-disable-next-line security/detect-object-injection
        const previousBallot = i > 0 ? ballots[i - 1] : null;
        const expectedPrevHash = previousBallot?.ballot_hash || null;

        // Votes für diesen Ballot laden (nur für valide Ballots)
        let voteDecision = [];
        if (current.valid) {
          const votesResult = await db.query(
            `SELECT listnum, votes
             FROM ballotvotes
             WHERE ballot = $1
             ORDER BY listnum ASC`,
            [current.id],
          );
          voteDecision = votesResult.rows;
        }

        // Hash neu berechnen mit BALLOT_SECRET
        const recalculatedHash = await generateBallotHashes({
          electionId,
          voteDecision,
          valid: current.valid,
          previousHash: expectedPrevHash,
        });

        // 1. Prüfe: Gespeicherter Hash stimmt mit neu berechnetem überein?
        if (recalculatedHash !== current.ballot_hash) {
          errors.push({
            type: 'HASH_MISMATCH',
            currentSerialId: current.serial_id,
            currentId: current.id,
            expectedHash: recalculatedHash,
            foundHash: current.ballot_hash,
            isValid: current.valid,
            message: `Stimmzettel #${current.serial_id} wurde manipuliert! Hash stimmt nicht überein.`,
          });
        } else {
          verifiedBallots++;
        }

        // 2. Prüfe: Ketten-Integrität (Genesis und Verkettung)
        if (i === 0 && current.previous_ballot_hash !== null) {
          errors.push({
            type: 'INVALID_GENESIS',
            currentSerialId: current.serial_id,
            currentId: current.id,
            expectedHash: null,
            foundHash: current.previous_ballot_hash,
            message: `Erster Stimmzettel sollte keinen previous_hash haben`,
          });
        } else if (i > 0 && current.previous_ballot_hash !== expectedPrevHash) {
          errors.push({
            type: 'CHAIN_BROKEN',
            currentSerialId: current.serial_id,
            currentId: current.id,
            expectedHash: expectedPrevHash,
            foundHash: current.previous_ballot_hash,
            message: `Hash-Kette unterbrochen bei Stimmzettel #${current.serial_id}`,
          });
        }
      }

      const result = {
        success: errors.length === 0,
        totalChecked: ballots.length,
        verifiedBallots: verifiedBallots,
        errors: errors,
        electionInfo: {
          id: election.id,
          name: election.info,
          type: election.election_type,
        },
        timestamp: new Date().toISOString(),
        message:
          errors.length === 0
            ? `✓ Alle ${ballots.length} Stimmzettel für "${election.info}" verifiziert - keine Manipulation erkannt`
            : `✗ ${errors.length} Fehler bei "${election.info}" gefunden (${verifiedBallots}/${ballots.length} verifiziert)`,
      };

      logger.info(result.message);
      return result;
    } catch (err) {
      logger.error(`Fehler bei Stimmzettel RE-HASH Prüfung für Wahl ${electionId}:`, err);
      return {
        success: false,
        totalChecked: 0,
        verifiedBallots: 0,
        errors: [{ message: err.message, type: 'INTERNAL_ERROR' }],
        timestamp: new Date().toISOString(),
      };
    } finally {
      db.release();
    }
  },

  /**
   * Prüft ALLE Wahlen und deren Stimmzettel mittels RE-HASHING
   * @returns {Promise<{success: boolean, totalElections: number, totalBallots: number, verifiedBallots: number, results: array, timestamp: string}>}
   */
  verifyAllBallotChains: async () => {
    const db = await client.connect();
    try {
      logger.info('Starte RE-HASH Prüfung aller Stimmzettel...');

      // Lade alle Wahlen
      const { rows: elections } = await db.query(
        'SELECT id, info, election_type FROM elections ORDER BY start DESC',
      );

      if (elections.length === 0) {
        return {
          success: true,
          totalElections: 0,
          totalBallots: 0,
          verifiedBallots: 0,
          results: [],
          message: 'Keine Wahlen vorhanden.',
          timestamp: new Date().toISOString(),
        };
      }

      // Prüfe jede Wahl
      const results = [];
      let totalErrors = 0;
      let totalBallots = 0;
      let totalVerified = 0;

      for (const election of elections) {
        const result = await integrityService.verifyBallotChain(election.id);
        results.push(result);
        totalErrors += result.errors.length;
        totalBallots += result.totalChecked;
        totalVerified += result.verifiedBallots || 0;
      }

      const isValid = totalErrors === 0;

      logger.info(
        `RE-HASH Prüfung abgeschlossen: valid=${isValid}, elections=${elections.length}, ballots=${totalBallots}, verified=${totalVerified}, errors=${totalErrors}`,
      );

      return {
        success: isValid,
        totalElections: elections.length,
        totalBallots: totalBallots,
        verifiedBallots: totalVerified,
        totalErrors: totalErrors,
        results: results,
        timestamp: new Date().toISOString(),
        message: isValid
          ? `✓ Alle ${totalBallots} Stimmzettel in ${elections.length} Wahlen verifiziert - keine Manipulation erkannt`
          : `✗ ${totalErrors} Fehler in ${elections.length} Wahlen gefunden (${totalVerified}/${totalBallots} verifiziert)`,
      };
    } catch (err) {
      logger.error('Fehler bei RE-HASH Prüfung aller Stimmzettel:', err);
      return {
        success: false,
        totalElections: 0,
        totalBallots: 0,
        verifiedBallots: 0,
        results: [],
        errors: [{ message: err.message }],
        timestamp: new Date().toISOString(),
      };
    } finally {
      db.release();
    }
  },
};
