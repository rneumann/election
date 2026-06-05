import express from 'express';
import { ensureAuthenticated, ensureHasRole } from '../auth/auth.js';
import { streamWorkbook } from '../utils/excel.js';
import { streamOdsFile } from '../utils/ods.js';
import {
  generateElectionTemplate,
  generateElectionTemplateOds,
  generateVoterTemplate,
  generateVoterTemplateOds,
} from '../service/template.service.js';

export const downloadRouter = express.Router();

// GET /api/download/template/elections?preset=generic&format=ods
downloadRouter.get(
  '/template/elections',
  ensureAuthenticated,
  ensureHasRole('admin'),
  async (req, res) => {
    try {
      const preset = req.query.preset || 'generic';
      const format = req.query.format === 'xlsx' ? 'xlsx' : 'ods';

      if (format === 'ods') {
        const sheets = await generateElectionTemplateOds(preset);
        await streamOdsFile(sheets, res, `HKA_Vorlage_${preset}.ods`);
      } else {
        const workbook = await generateElectionTemplate(preset);
        await streamWorkbook(workbook, res, `HKA_Vorlage_${preset}.xlsx`);
      }
    } catch (err) {
      res.status(500).json({ message: 'Fehler beim Generieren der Vorlage', error: err.message });
    }
  },
);

// GET /api/download/template/voters?format=ods
downloadRouter.get(
  '/template/voters',
  ensureAuthenticated,
  ensureHasRole('admin'),
  async (req, res) => {
    try {
      const format = req.query.format === 'xlsx' ? 'xlsx' : 'ods';

      if (format === 'ods') {
        const sheets = generateVoterTemplateOds();
        await streamOdsFile(sheets, res, 'HKA_Waehler_Vorlage.ods');
      } else {
        const workbook = await generateVoterTemplate();
        await streamWorkbook(workbook, res, 'HKA_Waehler_Vorlage.xlsx');
      }
    } catch (err) {
      res.status(500).json({ message: 'Fehler beim Generieren der Vorlage', error: err.message });
    }
  },
);
