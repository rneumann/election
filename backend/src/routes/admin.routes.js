import fs from 'fs/promises';
import path from 'path';
import express from 'express';
import multer from 'multer';
import { logger } from '../conf/logger/logger.js';

export const adminRouter = express.Router();

// Multer setup - store files temporarily
const uploadDir = path.join(process.cwd(), 'uploads', 'temp');
const upload = multer({ dest: uploadDir });

// Path to master configuration file
const MASTER_CONFIG_PATH = path.join(process.cwd(), 'data', 'election_presets.json');

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
 * Get list of all available election preset keys
 */
adminRouter.get('/config/presets', async (req, res) => {
  try {
    let presets = {};
    try {
      const rawData = await fs.readFile(MASTER_CONFIG_PATH, 'utf-8');
      presets = JSON.parse(rawData);
    } catch (readErr) {
      // File doesn't exist yet, that's OK
      logger.debug('Keine existierende Konfiguration gefunden.', readErr);
    }

    // Always include "generic" option
    const keys = Object.keys(presets);
    if (!keys.includes('generic')) {
      keys.unshift('generic');
    }

    res.json(keys);
  } catch (error) {
    logger.error('Fehler beim Laden der Preset-Liste:', error);
    res.status(500).json({ error: 'Konnte Presets nicht laden' });
  }
});
