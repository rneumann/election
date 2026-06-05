/**
 * Simulate-Mode Endpunkte.
 * Alle Routen sind nur erreichbar wenn SIMULATE_MODE=true gesetzt ist.
 */

import express from 'express';
import { client } from '../database/db.js';
import { logger } from '../conf/logger/logger.js';

export const simulateRouter = express.Router();

const isSimulateMode = () => process.env.SIMULATE_MODE === 'true';

/**
 * GET /api/simulate/status
 * Öffentlich erreichbar – Frontend fragt damit den Simulate-Mode-Status ab.
 */
simulateRouter.get('/status', (req, res) => {
  res.json({ simulateMode: isSimulateMode() });
});

/**
 * GET /api/simulate/voters
 * Gibt alle Wähler-UIDs zurück.
 * Nur im Simulate-Mode verfügbar.
 */
simulateRouter.get('/voters', async (req, res) => {
  if (!isSimulateMode()) {
    return res.status(403).json({ message: 'Nur im Simulate-Mode verfügbar' });
  }

  try {
    const result = await client.query(
      'SELECT uid, firstname, lastname FROM voters ORDER BY uid',
    );
    logger.warn(`SIMULATE_MODE: Wähler-Liste abgerufen (${result.rows.length} Einträge)`);
    res.json(result.rows);
  } catch (err) {
    logger.error('Fehler beim Abrufen der Wähler:', err);
    res.status(500).json({ message: 'Datenbankfehler' });
  }
});
