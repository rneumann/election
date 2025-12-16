import express from 'express';
import { ensureAuthenticated, ensureHasRole } from '../auth/auth.js';
import { generateElectionTemplate } from '../service/template.service.js';
import { streamWorkbook } from '../utils/excel.js';

export const downloadRouter = express.Router();

// GET /api/download/template/elections
// Lädt das HKA-konforme Excel-Template herunter
downloadRouter.get(
  '/template/elections',
  ensureAuthenticated,
  ensureHasRole('admin'),
  async (req, res) => {
    try {
      const workbook = await generateElectionTemplate();
      await streamWorkbook(workbook, res, 'HKA_Wahl_Vorlage.xlsx');
    } catch (err) {
      res.status(500).json({ message: 'Fehler beim Generieren der Vorlage', error: err.message });
    }
  },
);
