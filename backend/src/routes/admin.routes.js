import fs from 'fs/promises';
import path from 'path';
import multer from 'multer';

import express from 'express';
import { ensureAuthenticated, ensureHasRole } from '../auth/auth.js';
import { logger } from '../conf/logger/logger.js';
import { getElectionById } from '../service/voter.service.js';
import {
  controlTestElection,
  deleteAllData,
  deleteAllElectionData,
  getElectionsForAdmin,
  resetElectionData,
} from '../service/admin.service.js';
import { getAvailablePresets } from '../service/template.service.js';

export const adminRouter = express.Router();

// Constants
const ERROR_INTERNAL_SERVER = 'Internal Server Error';

// Multer setup - store files temporarily
const uploadDir = path.join(process.cwd(), 'uploads', 'temp');
const upload = multer({ dest: uploadDir });

// Path to master configuration file
const MASTER_CONFIG_PATH = path.join(process.cwd(), 'data', 'election_presets.json');

/**
 * @openapi
 * /api/admin/elections:
 *   get:
 *     summary: Get all elections (Admin only)
 *     description: Retrieves all elections with candidate and ballot counts
 *     tags:
 *       - Admin
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of all elections
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not an admin)
 *       500:
 *         description: Internal server error
 */
adminRouter.get('/elections', ensureAuthenticated, ensureHasRole(['admin']), async (req, res) => {
  const { status } = req.query;

  if (status && !['active', 'finished', 'future'].includes(status)) {
    logger.warn(`Invalid status parameter: ${status}`);
    return res.status(400).json({ message: 'Invalid status parameter' });
  }

  try {
    const elections = await getElectionsForAdmin(status);
    logger.debug(`Admin elections retrieved: ${elections.length}`);
    res.status(200).json(elections);
  } catch (error) {
    logger.error(`Failed to retrieve admin elections: ${error.message}`);
    res.status(500).json({ message: ERROR_INTERNAL_SERVER });
  }
});

adminRouter.put(
  '/controlTestElection/:electionId',
  ensureAuthenticated,
  ensureHasRole(['admin']),
  async (req, res) => {
    logger.debug('Election route for admin accessed to control test election');
    const electionId = req.params?.electionId;

    if (!electionId) {
      // eslint-disable-next-line
      logger.warn('Election id is required');
      return res.status(400).json({ message: 'Election id is required' });
    }

    try {
      const election = await getElectionById(electionId);
      if (!election) {
        // eslint-disable-next-line
        logger.warn('Election not found');
        return res.status(404).json({ message: 'Election not found' });
      }
      const currentTime = new Date();
      if (
        (currentTime > new Date(election.start) && currentTime < new Date(election.end)) ||
        currentTime > new Date(election.end)
      ) {
        logger.warn(
          'Election is active or finished, you cannot control test election during an active or finished election',
        );
        return res
          .status(400)
          .json({ message: 'Election is active or finished, control is not possible!' });
      }

      await controlTestElection(electionId);
      logger.debug(`Test election status toggled for election ID: ${electionId}`);
      return res.sendStatus(204);
    } catch (error) {
      logger.debug(`Failed to reset election data for ${electionId}: ${error.message}`);
      logger.error(`Failed to reset election data for ${electionId}`);
      return res.status(500).json({ message: ERROR_INTERNAL_SERVER });
    }
  },
);

/**
 * @openapi
 * /api/admin/resetElectionData/{electionId}:
 *   delete:
 *     summary: Reset election data (Admin only)
 *     description: Resets the election data for the specified election ID
 *     tags:
 *       - Admin
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: electionId
 *         in: path
 *         description: The ID of the election to reset
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Election data reset successfully
 *       400:
 *         description: Bad request (election is active)
 *       404:
 *         description: Election not found
 *       500:
 *         description: Internal server error
 */
adminRouter.delete(
  '/resetElectionData/:electionId',
  ensureAuthenticated,
  ensureHasRole(['admin']),
  async (req, res) => {
    const electionId = req.params?.electionId;

    if (!electionId) {
      logger.warn('Election id is required');
      return res.status(400).json({ message: 'Election id is required' });
    }

    try {
      const election = await getElectionById(electionId);
      if (!election) {
        logger.warn('Election not found');
        return res.status(404).json({ message: 'Election not found' });
      }
      const currentTime = new Date();
      if (currentTime > new Date(election.start) && currentTime < new Date(election.end)) {
        logger.warn('Election is active, you cannot reset data during an active election');
        return res.status(400).json({ message: 'Election is active, reset is not possible!' });
      }
      await resetElectionData(electionId);
      logger.debug(`Election data reset for election ID: ${electionId}`);
      return res.sendStatus(204);
    } catch (error) {
      logger.debug(`Failed to reset election data for ${electionId}: ${error.message}`);
      logger.error(`Failed to reset election data for ${electionId}`);
      return res.status(500).json({ message: ERROR_INTERNAL_SERVER });
    }
  },
);

adminRouter.delete(
  '/deleteAllData',
  ensureAuthenticated,
  ensureHasRole(['admin']),
  async (req, res) => {
    logger.debug('Election route for admin accessed to delete all data');
    const electionId = req.query?.electionId;
    if (!electionId) {
      logger.info('Delete all data!');
      try {
        await deleteAllData(req.user?.username || 'system', req.user?.role || 'admin');
        logger.debug('All data deleted successfully');
        res.sendStatus(204);
      } catch (error) {
        logger.debug(`Failed to delete all data: ${error.message}`);
        logger.error('Failed to delete all data');
        res.status(500).json({ message: ERROR_INTERNAL_SERVER });
      }
    } else {
      logger.info(`Delete data for election ID: ${electionId}`);
      try {
        const election = await getElectionById(electionId);
        if (!election) {
          logger.warn('Election not found');
          return res.status(404).json({ message: 'Election not found' });
        }
        await deleteAllElectionData(
          electionId,
          req.user?.username || 'system',
          req.user?.role || 'admin',
        );
        logger.debug(`Election data reset for election ID: ${electionId}`);
        res.sendStatus(204);
      } catch (error) {
        logger.debug(`Failed to reset election data for ${electionId}: ${error.message}`);
        logger.error(`Failed to reset election data for ${electionId}`);
        res.status(500).json({ message: ERROR_INTERNAL_SERVER });
      }
    }
  },
);

// NEU ab hier
/**
 * POST /admin/config/presets
 * Upload and merge new election preset configuration
 */
adminRouter.post('/config/presets', upload.single('configFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Keine Datei hochgeladen' });
    }

    // 1. Read newly uploaded data
    const newDataRaw = await fs.readFile(req.file.path, 'utf-8');
    let newData;
    try {
      newData = JSON.parse(newDataRaw);
    } catch (parseErr) {
      logger.error('Fehler beim Parsen der JSON-Datei:', parseErr);
      await fs.unlink(req.file.path); // Clean up
      return res.status(400).json({ error: 'Ungültiges JSON-Format' });
    }

    // 2. Read existing data (if available)
    let currentData = {};
    try {
      const oldDataRaw = await fs.readFile(MASTER_CONFIG_PATH, 'utf-8');
      currentData = JSON.parse(oldDataRaw);
    } catch (readErr) {
      // File doesn't exist yet, start fresh
      logger.debug('Keine existierende Konfiguration gefunden, erstelle neu.', readErr);
    }

    // 3. MERGE: Old data + New data (New overrides Old if same key)
    const mergedData = {
      ...currentData, // Keep what was there
      ...newData, // Add/override with new
    };

    // 4. Save merged result
    await fs.writeFile(MASTER_CONFIG_PATH, JSON.stringify(mergedData, null, 2));

    // 5. Clean up temporary file
    await fs.unlink(req.file.path);

    logger.info(
      `Wahl-Konfiguration aktualisiert. Jetzt ${Object.keys(mergedData).length} Wahlarten verfügbar.`,
    );

    res.json({
      message: 'Konfiguration erfolgreich erweitert/aktualisiert.',
      availablePresets: Object.keys(mergedData),
    });
  } catch (error) {
    logger.error('Fehler beim Update der Wahl-Konfiguration:', error);
    // Try to clean up if file exists
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupErr) {
        logger.debug('Fehler beim Löschen der temporären Datei:', cleanupErr);
      }
    }
    res.status(500).json({ error: 'Fehler beim Verarbeiten der Datei.' });
  }
});

/**
 * GET /admin/config/presets
 * Get list of all available election presets (internal + external)
 */
adminRouter.get('/config/presets', async (req, res) => {
  try {
    const presets = await getAvailablePresets();
    res.json(presets);
  } catch (error) {
    logger.error('Fehler beim Laden der Preset-Liste:', error);
    res.status(500).json({ error: 'Konnte Presets nicht laden' });
  }
});

/**
 * GET /admin/config/template
 * Download example configuration template as JSON file
 */
adminRouter.get('/config/template', (req, res) => {
  try {
    const exampleConfig = {
      meine_wahlart: {
        info: 'Meine Wahlart (Beispiel)',
        description: 'Beschreibung der Wahlart - für Admin-Dokumentation',
        counting_method: 'highest_votes',
        votes_per_ballot: 1,
        candidates_per_list: 5,
        absolute_majority_required: false,
        allow_cumulation: false,
        allow_panachage: false,
      },
      verhaeltniswahl_beispiel: {
        info: 'Verhältniswahl Beispiel',
        description: 'Beispiel: Verhältniswahl mit Sainte-Laguë',
        counting_method: 'sainte_laguë',
        votes_per_ballot: 1,
        candidates_per_list: 10,
        absolute_majority_required: false,
        allow_cumulation: true,
        allow_panachage: true,
      },
      mehrheitswahl_beispiel: {
        info: 'Mehrheitswahl Beispiel',
        description: 'Beispiel: Mehrheitswahl mit einfacher Mehrheit',
        counting_method: 'highest_votes',
        votes_per_ballot: 2,
        candidates_per_list: 5,
        absolute_majority_required: false,
        allow_cumulation: false,
        allow_panachage: false,
      },
      urabstimmung_beispiel: {
        info: 'Urabstimmung Beispiel',
        description: 'Beispiel: Abstimmung (Ja/Nein/Enthaltung)',
        counting_method: 'referendum',
        votes_per_ballot: 1,
        candidates_per_list: 0,
        absolute_majority_required: true,
        allow_cumulation: false,
        allow_panachage: false,
      },
    };

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="election_presets_template.json"');

    logger.info('Konfiguration-Template heruntergeladen');
    // Formatiertes JSON mit Indentation
    res.send(JSON.stringify(exampleConfig, null, 2));
  } catch (error) {
    logger.error('Fehler beim Bereitstellen des Config-Templates:', error);
    res.status(500).json({ error: 'Konnte Template nicht generieren' });
  }
});
