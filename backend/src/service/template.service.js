import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';
import { logger } from '../conf/logger/logger.js';

// Setup für Dateipfade
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pfad zur hochgeladenen Konfigurationsdatei
const CONFIG_PATH = path.join(__dirname, '../../data/election_presets.json');

// --- KONSTANTEN FÜR FARBEN ---
const HKA_RED = 'FFE30613';
const HKA_BLACK = 'FF000000';
const HKA_GREY = 'FFEEEEEE';
const FONT_WHITE = 'FFFFFFFF';

// --- KONSTANTEN FÜR WAHL-BEGRIFFE ---
const TYPE_VERHAELTNIS = 'Verhältniswahl';
const TYPE_MEHRHEIT = 'Mehrheitswahl';
const TYPE_URABSTIMMUNG = 'Urabstimmung';

const METHOD_SAINTE_LAGUE = 'Sainte-Laguë';
const METHOD_HARE_NIEMEYER = 'Hare-Niemeyer';
const METHOD_SIMPLE_MAJORITY = 'Einfache Mehrheit';
const METHOD_ABSOLUTE_MAJORITY = 'Absolute Mehrheit';
const METHOD_YES_NO = 'Ja/Nein/Enthaltung';

// --- LAYOUT KONSTANTEN ---
const ROW_START_DATA = 8;
const VALIDATION_MAX_ROW = 100;
const DEFAULT_DURATION_DAYS = 14;
const COL_WIDTHS = [20, 40, 15, 20, 15, 15, 30, 30];

// --- FALLBACK PRESETS ---
const DEFAULT_PRESETS = {
  generic: {
    info: 'Gremienwahl Beispiel',
    type: '',
    method: '',
    listen: 1,
    seats: null,
    votes: null,
    kum: null,
  },
};

/*
 * Mapper: Konvertiert neue JSON-Format zu altem Format
 * Neue JSON: { counting_method, votes_per_ballot, candidates_per_list, absolute_majority_required, allow_cumulation, allow_panachage }
 * Altes Format: { type, method, listen, seats, votes, kum }
 */
const mapNewFormatToOld = (preset, presetKey) => {
  // Wahltyp bestimmen
  let type = '';
  let method = '';
  let seats = null;
  let votes = null;
  let listen = 0;
  let kum = null;

  const countingMethod = preset.counting_method || 'highest_votes';
  const votesPerBallot = preset.votes_per_ballot || 1;
  const allowCumulation = preset.allow_cumulation || false;

  // 1. Wahltyp und Zählverfahren bestimmen
  if (countingMethod === 'referendum') {
    type = TYPE_URABSTIMMUNG;
    method = METHOD_YES_NO;
    votes = 1;
    seats = 1;
  } else if (countingMethod === 'sainte_laguë' || countingMethod === 'sainte_lague') {
    type = TYPE_VERHAELTNIS;
    method = METHOD_SAINTE_LAGUE;
    listen = 1;
  } else if (countingMethod === 'hare_niemeyer') {
    type = TYPE_VERHAELTNIS;
    method = METHOD_HARE_NIEMEYER;
    listen = 1;
  } else if (countingMethod === 'highest_votes') {
    type = TYPE_MEHRHEIT;
    method = METHOD_SIMPLE_MAJORITY;
    votes = votesPerBallot;
    if (preset.absolute_majority_required) {
      method = METHOD_ABSOLUTE_MAJORITY;
    }
  }

  // 2. Kumulieren
  if (allowCumulation) {
    kum = votesPerBallot;
  }

  return {
    info: preset.info || 'Wahl',
    type,
    method,
    listen,
    seats,
    votes,
    kum,
  };
};

/*
 * Lädt die Presets aus der JSON-Datei oder nutzt Defaults.
 */
const loadPresets = async () => {
  try {
    await fs.access(CONFIG_PATH);
    const data = await fs.readFile(CONFIG_PATH, 'utf-8');
    const presets = JSON.parse(data);

    logger.debug(`Geladene Presets: ${Object.keys(presets).join(', ')}`);

    // Alle Presets mit dem Mapper konvertieren
    const convertedPresets = {};
    Object.entries(presets).forEach(([key, preset]) => {
      logger.debug(
        `Verarbeite Preset "${key}": counting_method=${preset.counting_method}, type=${preset.type}`,
      );

      if (preset && preset.counting_method !== undefined) {
        // Neues Format -> konvertieren
        const converted = mapNewFormatToOld(preset, key);
        logger.debug(
          `Konvertiert "${key}": type=${converted.type}, method=${converted.method}, listen=${converted.listen}`,
        );
        convertedPresets[key] = converted;
      } else if (preset && preset.type !== undefined) {
        // Altes Format -> direkt übernehmen
        convertedPresets[key] = preset;
      } else {
        logger.warn(`Preset "${key}" hat weder counting_method noch type!`);
      }
    });

    logger.info(
      `Wahl-Presets geladen und konvertiert: ${Object.keys(convertedPresets).join(', ')}`,
    );
    return convertedPresets;
  } catch (error) {
    logger.warn('Keine eigene Wahl-Konfiguration gefunden. Nutze Standards.', error.message);
    return DEFAULT_PRESETS;
  }
};

/*
 * Erstellt das Template, basierend auf einem Preset Key.
 */
export const generateElectionTemplate = async (presetKey = 'generic') => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'HKA E-Voting System';

  // 1. Konfiguration dynamisch laden
  const allPresets = await loadPresets();

  // Gewähltes Preset suchen (oder Fallback auf generic)
  // eslint-disable-next-line security/detect-object-injection
  const config = allPresets[presetKey] || allPresets.generic || DEFAULT_PRESETS.generic;

  if (!config) {
    logger.error(`Preset nicht gefunden: ${presetKey}`);
  }

  // --- BLATT 1: WAHLEN ---
  const sheet = workbook.addWorksheet('Wahlen', { views: [{ showGridLines: false }] });

  // Spaltenbreiten setzen
  sheet.columns = COL_WIDTHS.map((w) => ({ width: w }));

  // Header & Styling
  sheet.mergeCells('A1:H2');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'Gremienwahlen - Konfiguration';
  titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: FONT_WHITE } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HKA_RED } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // Metadaten (Zeitraum)
  const d3 = sheet.getCell('D3');
  d3.value = 'Wahlzeitraum von:';
  d3.font = { bold: true };
  sheet.getCell('E3').value = new Date();

  const d4 = sheet.getCell('D4');
  d4.value = 'bis:';
  d4.font = { bold: true };
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + DEFAULT_DURATION_DAYS);
  sheet.getCell('E4').value = futureDate;

  // Spalten-Header Zeile 7
  const headers = [
    { cell: 'A7', val: 'Kennung' },
    { cell: 'B7', val: 'Info (Name)' },
    { cell: 'C7', val: 'Listen (1=Ja)' },
    { cell: 'D7', val: 'Plätze' },
    { cell: 'E7', val: 'Stimmen/Zettel' },
    { cell: 'F7', val: 'max. Kum.' },
    { cell: 'G7', val: 'Wahltyp' },
    { cell: 'H7', val: 'Zählverfahren' },
  ];

  headers.forEach((h) => {
    const c = sheet.getCell(h.cell);
    c.value = h.val;
    c.font = { bold: true };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HKA_GREY } };
    c.border = { bottom: { style: 'medium' } };
  });

  // --- VORAUSGEFÜLLTE ZEILE (ROW 8) ---
  const row = sheet.getRow(ROW_START_DATA);
  row.values = [
    presetKey === 'generic' ? 'wahl_kennung' : presetKey,
    config.info,
    config.listen,
    config.seats,
    config.votes,
    config.kum,
    config.type,
    config.method,
  ];

  // Strings für Dropdowns vorbereiten
  const typeList = `"${TYPE_VERHAELTNIS},${TYPE_MEHRHEIT},${TYPE_URABSTIMMUNG}"`;
  const methodList = `"${METHOD_SAINTE_LAGUE},${METHOD_HARE_NIEMEYER},${METHOD_SIMPLE_MAJORITY},${METHOD_ABSOLUTE_MAJORITY},${METHOD_YES_NO}"`;

  // Dropdowns für Validierung (Zeile 8 bis 100)
  for (let i = ROW_START_DATA; i <= VALIDATION_MAX_ROW; i += 1) {
    sheet.getCell(`G${i}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [typeList],
    };
    sheet.getCell(`H${i}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [methodList],
    };
  }

  // --- BLATT 2: KANDIDATEN ---
  const candSheet = workbook.addWorksheet('Listenvorlage');
  candSheet.columns = [
    { width: 20 },
    { width: 15 },
    { width: 15 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
    { width: 30 },
    { width: 10 },
  ];
  const candHeaders = [
    'Wahl Kennung',
    'Mtr-Nr.',
    'Fakultät',
    'Nachname',
    'Vorname',
    'Liste/Keyword',
    'Notizen',
    'Zugelassen?',
  ];
  const cRow = candSheet.getRow(1);
  cRow.values = candHeaders;
  cRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: FONT_WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HKA_BLACK } };
  });

  // Beispiel-Kandidat
  candSheet.getRow(2).values = [
    presetKey === 'generic' ? 'wahl_kennung' : presetKey,
    '123456',
    'IWI',
    'Mustermann',
    'Max',
    config.listen === 1 ? 'Liste A' : 'Einzelkandidat',
    '',
    'ja',
  ];

  logger.info(`Wahl-Template generiert für Preset: ${presetKey}`);
  return workbook;
};

/*
 * Wähler Template Generator
 */
export const generateVoterTemplate = async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'HKA E-Voting System';
  const sheet = workbook.addWorksheet('Wählerverzeichnis');

  sheet.columns = [{ width: 15 }, { width: 30 }, { width: 20 }, { width: 20 }, { width: 15 }];
  const headers = ['MatrikelNr', 'E-Mail', 'Vorname', 'Nachname', 'Fakultät'];
  const headerRow = sheet.getRow(1);
  headerRow.values = headers;

  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: FONT_WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HKA_RED } };
  });

  sheet.getRow(2).values = ['123456', 'muma1011@h-ka.de', 'Max', 'Mustermann', 'IWI'];
  return workbook;
};
