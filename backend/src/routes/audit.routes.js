import express from 'express';
import { client } from '../database/db.js';
import { ensureAuthenticated, ensureHasRole } from '../auth/auth.js';
import { logger } from '../conf/logger/logger.js';
import { generateBallotHashes } from '../security/generate-ballot-hashes.js';

export const auditRouter = express.Router();

/*
 * @openapi
 * /api/audit/logs:
 * get:
 * summary: Retrieve audit logs
 * description: Fetches the list of audit logs. Requires Admin role.
 * tags:
 * - Audit
 * security:
 * - cookieAuth: []
 * responses:
 * 200:
 * description: List of audit logs
 * content:
 * application/json:
 * schema:
 * type: array
 * items:
 * type: object
 * 403:
 * description: Forbidden
 */

const DEFAULT_LOG_LIMIT = 1000000;

auditRouter.get('/logs', ensureAuthenticated, ensureHasRole(['admin']), async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : DEFAULT_LOG_LIMIT;
    const result = await client.query('SELECT * FROM audit_log ORDER BY id DESC LIMIT $1', [limit]);
    res.json(result.rows);
  } catch (err) {
    logger.error('Error fetching audit logs:', err);
    res.status(500).json({ error: 'Serverfehler beim Abrufen der Logs' });
  }
});

/*
 * @openapi
 * /api/audit/verify-ballots:
 *   get:
 *     summary: Verify ballot hash integrity
 *     description: |
 *       Verifies the integrity of ALL ballots by re-calculating the hash from
 *       the original vote data using the BALLOT_SECRET. This detects ANY manipulation
 *       of votes, even if an attacker tried to fix the hash chain afterwards.
 *     tags:
 *       - Audit
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Verification result
 *       403:
 *         description: Forbidden
 */
auditRouter.get(
  '/verify-ballots',
  ensureAuthenticated,
  ensureHasRole(['admin']),
  async (req, res) => {
    try {
      // Alle Wahlen mit Ballots abrufen
      const electionsResult = await client.query(`
        SELECT DISTINCT election FROM ballots ORDER BY election
      `);

      const elections = electionsResult.rows.map((r) => r.election);
      const errors = [];
      let totalBallots = 0;
      let validBallots = 0;

      for (const electionId of elections) {
        // Ballots pro Wahl in korrekter Reihenfolge laden
        const ballotsResult = await client.query(
          `
          SELECT id, serial_id, ballot_hash, previous_ballot_hash, valid
          FROM ballots
          WHERE election = $1
          ORDER BY serial_id ASC
        `,
          [electionId],
        );

        const ballots = ballotsResult.rows;
        totalBallots += ballots.length;

        for (let i = 0; i < ballots.length; i++) {
          // eslint-disable-next-line security/detect-object-injection
          const current = ballots[i];
          const previousBallot = i > 0 ? ballots.at(i - 1) : null;
          const expectedPrevHash = previousBallot?.ballot_hash;

          // Votes für diesen Ballot laden (nur für valide Ballots)
          let voteDecision = [];
          if (current.valid) {
            const votesResult = await client.query(
              `
              SELECT listnum, votes
              FROM ballotvotes
              WHERE ballot = $1
              ORDER BY listnum ASC
            `,
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

          // Vergleichen
          if (recalculatedHash !== current.ballot_hash) {
            errors.push({
              electionId,
              serialId: current.serial_id,
              type: 'HASH_MISMATCH',
              message: `Ballot #${current.serial_id} wurde manipuliert! Hash stimmt nicht überein.`,
              expected: recalculatedHash,
              actual: current.ballot_hash,
              isValid: current.valid,
            });
          } else {
            validBallots++;
          }

          // Zusätzlich: Ketten-Integrität prüfen (für bessere Fehlermeldungen)
          if (i === 0 && current.previous_ballot_hash !== null) {
            errors.push({
              electionId,
              serialId: current.serial_id,
              type: 'INVALID_GENESIS',
              message: `Erster Ballot sollte keinen previous_hash haben`,
              expected: null,
              actual: current.previous_ballot_hash,
            });
          } else if (i > 0 && current.previous_ballot_hash !== expectedPrevHash) {
            errors.push({
              electionId,
              serialId: current.serial_id,
              type: 'CHAIN_BROKEN',
              message: `Hash-Kette unterbrochen bei Ballot #${current.serial_id}`,
              expected: expectedPrevHash,
              actual: current.previous_ballot_hash,
            });
          }
        }
      }

      const isValid = errors.length === 0;

      logger.info(
        `Ballot integrity check (RE-HASH) completed: valid=${isValid}, elections=${elections.length}, ballots=${totalBallots}, verified=${validBallots}, errors=${errors.length}`,
      );

      res.json({
        valid: isValid,
        totalBallots,
        verifiedBallots: validBallots,
        electionsChecked: elections.length,
        checkedAt: new Date().toISOString(),
        errors: isValid ? [] : errors,
        summary: isValid
          ? `Alle ${totalBallots} Ballots in ${elections.length} Wahlen wurden verifiziert - keine Manipulation erkannt.`
          : `WARNUNG: ${errors.length} Integritätsfehler gefunden! Mögliche Wahlmanipulation!`,
      });
    } catch (err) {
      logger.error('Error verifying ballot integrity:', err);
      res.status(500).json({ error: 'Serverfehler bei der Integritätsprüfung' });
    }
  },
);
