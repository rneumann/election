import express from 'express';
import { ensureAuthenticated, ensureHasRole } from '../auth/auth.js';
import { streamWorkbook } from '../utils/excel.js';
import { streamOdsFile } from '../utils/ods.js';
import { client } from '../database/db.js';
import {
  generateElectionTemplate,
  generateElectionTemplateFromData,
  generateElectionTemplateOds,
  generateElectionTemplateOdsFromData,
  generateVoterTemplate,
  generateVoterTemplateOds,
} from '../service/template.service.js';
// config-loader wird für zukünftige Config-abhängige Exports benötigt

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

// POST /api/templates-download/template/elections/custom
downloadRouter.post(
  '/template/elections/custom',
  ensureAuthenticated,
  ensureHasRole('admin'),
  async (req, res) => {
    try {
      const { startDate, startTime, endDate, endTime, elections, format } = req.body;

      if (!startDate || !endDate || !Array.isArray(elections) || elections.length === 0) {
        return res.status(400).json({ message: 'startDate, endDate und elections sind erforderlich' });
      }

      const data = { startDate, startTime, endDate, endTime, elections };
      const useOds = format !== 'xlsx';
      const filename = `HKA_Wahlkonfiguration.${useOds ? 'ods' : 'xlsx'}`;

      if (useOds) {
        const sheets = generateElectionTemplateOdsFromData(data);
        await streamOdsFile(sheets, res, filename);
      } else {
        const workbook = await generateElectionTemplateFromData(data);
        await streamWorkbook(workbook, res, filename);
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
        const sheets = await generateVoterTemplateOds();
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

// GET /api/download/elections/export?format=ods
// Exportiert alle aktuellen Wahlen aus der DB als ausgefüllte Tabellendatei
downloadRouter.get(
  '/elections/export',
  ensureAuthenticated,
  ensureHasRole('admin'),
  async (req, res) => {
    try {
      const format = req.query.format === 'xlsx' ? 'xlsx' : 'ods';
      // Alle Wahlen aus DB lesen
      const result = await client.query(
        `SELECT description AS identifier, info, listvotes, seats_to_fill,
                votes_per_ballot, max_cumulative_votes, free_slots,
                start, "end", election_type, counting_method
         FROM elections ORDER BY start ASC`,
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Keine Wahlen in der Datenbank gefunden.' });
      }

      // DB-Felder → Anzeige-Werte über Config-Mapping
      const ELECTION_TYPE_REVERSE = new Map([
        ['proportional_representation', 'Verhältniswahl'],
        ['majority_vote',               'Mehrheitswahl'],
        ['referendum',                  'Urabstimmung'],
      ]);
      const COUNTING_METHOD_REVERSE = new Map([
        ['sainte_lague',            'Sainte-Laguë'],
        ['hare_niemeyer',           'Hare-Niemeyer'],
        ['highest_votes_simple',    'Einfache Mehrheit'],
        ['highest_votes_absolute',  'Absolute Mehrheit'],
        ['yes_no_referendum',       'Ja/Nein/Enthaltung'],
      ]);

      const toLocalDateStr = (ts) => new Date(ts).toLocaleDateString('de-DE');
      const toLocalTimeStr = (ts) =>
        new Date(ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

      // Einheitlicher Zeitraum aus erster/letzter Wahl
      const startDate = toLocalDateStr(result.rows[0].start);
      const startTime = toLocalTimeStr(result.rows[0].start);
      const endDate   = toLocalDateStr(result.rows[result.rows.length - 1].end);
      const endTime   = toLocalTimeStr(result.rows[result.rows.length - 1].end);

      const elections = result.rows.map((row) => ({
        kennung:        row.identifier || '',
        info:           row.info,
        listen:         row.listvotes,
        plaetze:        row.seats_to_fill,
        stimmen:        row.votes_per_ballot,
        kum:            row.max_cumulative_votes,
        wahltyp:        ELECTION_TYPE_REVERSE.get(row.election_type) || row.election_type,
        zaehlverfahren: COUNTING_METHOD_REVERSE.get(row.counting_method) || row.counting_method,
        freieplaetze:   row.free_slots,
      }));

      const data = { startDate, startTime, endDate, endTime, elections };
      const filename = `Wahlkonfiguration_Export.${format}`;

      if (format === 'ods') {
        const sheets = await generateElectionTemplateOdsFromData(data);
        await streamOdsFile(sheets, res, filename);
      } else {
        const workbook = await generateElectionTemplateFromData(data);
        await streamWorkbook(workbook, res, filename);
      }
    } catch (err) {
      res.status(500).json({ message: 'Fehler beim Export der Wahlen', error: err.message });
    }
  },
);
