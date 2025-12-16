import express from 'express';
import { ensureAuthenticated, ensureHasRole } from '../auth/auth.js';
import { streamWorkbook } from '../utils/excel.js';
import { generateElectionTemplate, generateVoterTemplate } from '../service/template.service.js';

export const downloadRouter = express.Router();

// GET /api/download/template/elections
// Lädt das HKA-konforme Excel-Template herunter
downloadRouter.get(
  '/template/elections',
  ensureAuthenticated,
  ensureHasRole('admin'),
  async (req, res) => {
    try {
      // Parameter 'preset' aus der Query lesen (Default: 'generic')
      const preset = req.query.preset || 'generic';

      const workbook = await generateElectionTemplate(preset);

      // Dateiname dynamisch machen
      const filename = `HKA_Vorlage_${preset}.xlsx`;

      await streamWorkbook(workbook, res, filename);
    } catch (err) {
      res.status(500).json({ message: 'Fehler beim Generieren der Vorlage', error: err.message });
    }
  },
);

downloadRouter.get(
  '/template/voters',
  ensureAuthenticated,
  ensureHasRole('admin'),
  async (req, res) => {
    try {
      const workbook = await generateVoterTemplate();
      await streamWorkbook(workbook, res, 'HKA_Waehler_Vorlage.xlsx');
    } catch (err) {
      res
        .status(500)
        .json({ message: 'Fehler beim Generieren der Wähler-Vorlage', error: err.message });
    }
  },
);
