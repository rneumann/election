/**
 * Simulate-Mode Endpunkte.
 * Der Simulationsmodus kann per API zur Laufzeit ein- und ausgeschaltet werden
 * (in-memory, kein Neustart nötig). Beim Serverstart gilt der Wert aus SIMULATE_MODE.
 */

import express from 'express';
import { client } from '../database/db.js';
import { logger } from '../conf/logger/logger.js';
import { ensureAuthenticated, ensureHasRole } from '../auth/auth.js';
import { writeAuditLog } from '../audit/auditLogger.js';

export const simulateRouter = express.Router();

let simulateModeActive = process.env.SIMULATE_MODE === 'true';
let simulateModeVersion = 0;

export const isSimulateMode = () => simulateModeActive;
export const getSimulateModeVersion = () => simulateModeVersion;

/** Wird von cleanupExpiredTestElections aufgerufen, wenn eine echte Wahl startet. */
export const disableSimulateMode = () => {
  if (simulateModeActive) {
    simulateModeActive = false;
    simulateModeVersion++;
    logger.warn('SIMULATE_MODE: automatisch deaktiviert, da eine echte Wahl gestartet hat.');
  }
};

/**
 * GET /api/simulate/status
 * Öffentlich erreichbar – Frontend fragt damit den Simulate-Mode-Status ab.
 */
simulateRouter.get('/status', (req, res) => {
  res.json({ simulateMode: simulateModeActive, version: simulateModeVersion });
});

/**
 * POST /api/simulate/toggle
 * Schaltet den Simulationsmodus zur Laufzeit ein oder aus.
 * Nur für Admins. Kann nicht aktiviert werden, wenn eine echte Wahl läuft.
 */
simulateRouter.post(
  '/toggle',
  ensureAuthenticated,
  ensureHasRole(['admin']),
  async (req, res) => {
    try {
      if (!simulateModeActive) {
        // Einschalten: nur erlaubt wenn keine echte Wahl gerade läuft
        const { rows } = await client.query(
          `SELECT id FROM elections WHERE start <= now() AND "end" >= now() LIMIT 1`,
        );
        if (rows.length > 0) {
          return res.status(409).json({
            message: 'Simulationsmodus kann nicht aktiviert werden, solange eine Wahl läuft.',
          });
        }
      }

      simulateModeActive = !simulateModeActive;
      simulateModeVersion++;
      logger.warn(`SIMULATE_MODE: manuell auf ${simulateModeActive} gesetzt von ${req.user?.username}`);

      writeAuditLog({
        actionType: simulateModeActive ? 'SIMULATE_MODE_ENABLED' : 'SIMULATE_MODE_DISABLED',
        level: 'WARN',
        actorId: req.user?.username,
        actorRole: req.user?.role,
        details: { info: `Simulationsmodus manuell ${simulateModeActive ? 'aktiviert' : 'deaktiviert'}` },
      }).catch((e) => logger.error(e));

      res.json({ simulateMode: simulateModeActive });
    } catch (err) {
      logger.error('Fehler beim Umschalten des Simulationsmodus:', err);
      res.status(500).json({ message: 'Interner Fehler' });
    }
  },
);

/**
 * GET /api/simulate/voters
 * Gibt alle Wähler-UIDs zurück.
 * Nur im Simulate-Mode verfügbar.
 */
simulateRouter.get('/voters', async (req, res) => {
  if (!simulateModeActive) {
    return res.status(403).json({ message: 'Nur im Simulate-Mode verfügbar' });
  }

  try {
    // Nur Wähler zurückgeben, die in mindestens einer aktiven Testwahl
    // noch nicht abgestimmt haben — so liefert jeder Eintrag auch wirklich
    // eine wählbare Wahl im Locust-Test.
    const result = await client.query(`
      SELECT DISTINCT v.uid, v.firstname, v.lastname
      FROM voters v
      INNER JOIN votingnotes vn ON vn.voterId = v.id
      INNER JOIN elections e ON e.id = vn.electionId
      WHERE e.test_election_active = true
        AND e."end" >= now()
        AND vn.voted = false
      ORDER BY v.uid
    `);
    logger.warn(`SIMULATE_MODE: Wähler-Liste abgerufen (${result.rows.length} wahlberechtigte Einträge)`);
    res.json(result.rows);
  } catch (err) {
    logger.error('Fehler beim Abrufen der Wähler:', err);
    res.status(500).json({ message: 'Datenbankfehler' });
  }
});
