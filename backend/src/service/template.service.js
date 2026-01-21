import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';
import { logger } from '../conf/logger/logger.js';

// Setup für Dateipfade
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.join(__dirname, '../../data/election_presets.json');

// --- KONSTANTEN FÜR DESIGN ---
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

// --- LAYOUT PARAMETER ---
const ROW_START_DATA = 8;
const VALIDATION_MAX_ROW = 100;
const DEFAULT_DURATION_DAYS = 14;

/**
 * INTERNE HKA STANDARDS
 */
const INTERNAL_PRESETS = {
  generic: {
    info: 'Gremienwahl Beispiel',
    type: '',
    method: '',
    listen: 1,
    seats: null,
    votes: null,
    kum: null,
  },
  stupa_verhaeltnis: {
    info: 'Studierendenparlament (Verhältniswahl)',
    type: TYPE_VERHAELTNIS,
    method: METHOD_SAINTE_LAGUE,
    listen: 1,
    seats: null,
    votes: null,
    kum: 0,
  },
  stupa_mehrheit: {
    info: 'Studierendenparlament (Mehrheitswahl)',
    type: TYPE_MEHRHEIT,
    method: METHOD_SIMPLE_MAJORITY,
    listen: 0,
    seats: null,
    votes: null,
    kum: null,
  },
  fachschaft: {
    info: 'Wahl des Fachschaftsvorstands',
    type: TYPE_MEHRHEIT,
    method: METHOD_ABSOLUTE_MAJORITY,
    listen: 0,
    seats: null,
    votes: 1,
    kum: 0,
  },
  senat_verhaeltnis: {
    info: 'Senat (Verhältniswahl)',
    type: TYPE_VERHAELTNIS,
    method: METHOD_HARE_NIEMEYER,
    listen: 1,
    seats: null,
    votes: null,
    kum: 2,
  },
  senat_mehrheit: {
    info: 'Senat (Mehrheitswahl)',
    type: TYPE_MEHRHEIT,
    method: METHOD_SIMPLE_MAJORITY,
    listen: 0,
    seats: null,
    votes: null,
    kum: 2,
  },
  fakrat_verhaeltnis: {
    info: 'Fakultätsrat (Verhältniswahl)',
    type: TYPE_VERHAELTNIS,
    method: METHOD_HARE_NIEMEYER,
    listen: 1,
    seats: null,
    votes: null,
    kum: null,
  },
  fakrat_mehrheit: {
    info: 'Fakultätsrat (Mehrheitswahl)',
    type: TYPE_MEHRHEIT,
    method: METHOD_SIMPLE_MAJORITY,
    listen: 0,
    seats: null,
    votes: null,
    kum: null,
  },
  urabstimmung: {
    info: 'Urabstimmung',
    type: TYPE_URABSTIMMUNG,
    method: METHOD_YES_NO,
    listen: 0,
    seats: 1,
    votes: 1,
    kum: 0,
  },
  prorektor: {
    info: 'Wahl der Prorektoren',
    type: TYPE_URABSTIMMUNG,
    method: METHOD_YES_NO,
    listen: 0,
    seats: 1,
    votes: 1,
    kum: 0,
  },
  dekan_wahlgang1: {
    info: 'Wahl Dekan/Prodekan (1. Wahlgang)',
    type: TYPE_MEHRHEIT,
    method: METHOD_ABSOLUTE_MAJORITY,
    listen: 0,
    seats: 1,
    votes: 1,
    kum: 0,
  },
  dekan_wahlgang2: {
    info: 'Wahl Dekan/Prodekan (2. Wahlgang)',
    type: TYPE_MEHRHEIT,
    method: METHOD_SIMPLE_MAJORITY,
    listen: 0,
    seats: 1,
    votes: 1,
    kum: 0,
  },
  senat_professoren: {
    info: 'Wahl der Professoren in den Senat',
    type: TYPE_MEHRHEIT,
    method: METHOD_SIMPLE_MAJORITY,
    listen: 0,
    seats: 2,
    votes: 2,
    kum: 2,
  },
};

const mapNewFormatToOld = (preset) => {
  const countingMethod = preset.counting_method || 'highest_votes';
  const votesPerBallot = preset.votes_per_ballot || 1;
  const allowCumulation = preset.allow_cumulation || false;

  let type = TYPE_MEHRHEIT;
  let method = METHOD_SIMPLE_MAJORITY;
  let seats = preset.candidates_per_list || null;
  let votes = votesPerBallot;
  let listen = 0;
  let kum = allowCumulation ? votesPerBallot : 0;

  if (countingMethod === 'referendum') {
    type = TYPE_URABSTIMMUNG;
    method = METHOD_YES_NO;
    seats = 1;
    votes = 1;
  } else if (countingMethod.includes('sainte')) {
    type = TYPE_VERHAELTNIS;
    method = METHOD_SAINTE_LAGUE;
    listen = 1;
  } else if (countingMethod === 'hare_niemeyer') {
    type = TYPE_VERHAELTNIS;
    method = METHOD_HARE_NIEMEYER;
    listen = 1;
  } else if (preset.absolute_majority_required) {
    method = METHOD_ABSOLUTE_MAJORITY;
  }

  return { info: preset.info || 'Wahl', type, method, listen, seats, votes, kum };
};

const loadAllPresets = async () => {
  let customPresets = {};
  try {
    const data = await fs.readFile(CONFIG_PATH, 'utf-8');
    const rawCustom = JSON.parse(data);
    Object.entries(rawCustom).forEach(([key, preset]) => {
      if (preset.counting_method) {
        customPresets[key] = mapNewFormatToOld(preset);
      } else {
        customPresets[key] = preset;
      }
    });
  } catch (e) {
    logger.debug('Keine externe Konfiguration gefunden.');
  }
  return { ...INTERNAL_PRESETS, ...customPresets };
};

/**
 * Generiert das Wahl-Template im HKA-Design.
 * Die Struktur entspricht exakt dem vom Importer erwarteten Schema.
 */
export const generateElectionTemplate = async (presetKey = 'generic') => {
  const workbook = new ExcelJS.Workbook();
  const allPresets = await loadAllPresets();
  const config = allPresets[presetKey] || allPresets.generic;

  // --- BLATT 1: WAHLEN ---
  const sheet = workbook.addWorksheet('Wahlen', { views: [{ showGridLines: false }] });
  sheet.columns = [
    { width: 20 }, // A: Kennung
    { width: 35 }, // B: Info
    { width: 20 }, // C: Listen
    { width: 17 }, // D: Plätze
    { width: 20 }, // E: Stimmen pro Zettel
    { width: 17 }, // F: max. Kum.
    { width: 25 }, // G: Wahltyp
    { width: 25 }, // H: Zählverfahren
  ];

  // Header Styling
  sheet.mergeCells('A1:H2');
  const title = sheet.getCell('A1');
  title.value = 'HKA E-Voting - Wahlkonfiguration';
  Object.assign(title, {
    font: { size: 16, bold: true, color: { argb: FONT_WHITE } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: HKA_RED } },
    alignment: { vertical: 'middle', horizontal: 'center' },
  });

  // Zeit-Meta
  sheet.getCell('B3').value = 'Wahlzeitraum von';
  sheet.getCell('D3').value = new Date().toLocaleDateString('de-DE');
  sheet.getCell('B4').value = 'bis';
  const future = new Date();
  future.setDate(future.getDate() + DEFAULT_DURATION_DAYS);
  sheet.getCell('D4').value = future.toLocaleDateString('de-DE');

  // Spalten-Header (Zeile 7) - EXAKTE NAMEN FÜR IMPORTER
  const headerTitles = [
    'Kennung',
    'Info',
    'Listen',
    'Plätze',
    'Stimmen pro Zettel',
    'max. Kum.',
    'Wahltyp',
    'Zählverfahren',
  ];
  const hRow = sheet.getRow(7);
  hRow.values = headerTitles;
  hRow.eachCell((c) => {
    c.font = { bold: true, color: { argb: FONT_WHITE } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HKA_BLACK } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // Datenzeile (Zeile 8)
  sheet.getRow(ROW_START_DATA).values = [
    presetKey === 'generic' ? 'meine_wahl_01' : presetKey,
    config.info,
    config.listen ?? 1,
    config.seats ?? '',
    config.votes ?? '',
    config.kum ?? '',
    config.type ?? '',
    config.method ?? '',
  ];

  // Dropdown Validierung
  const typeList = `"${TYPE_VERHAELTNIS},${TYPE_MEHRHEIT},${TYPE_URABSTIMMUNG}"`;
  const methodList = `"${METHOD_SAINTE_LAGUE},${METHOD_HARE_NIEMEYER},${METHOD_SIMPLE_MAJORITY},${METHOD_ABSOLUTE_MAJORITY},${METHOD_YES_NO}"`;
  for (let i = ROW_START_DATA; i <= VALIDATION_MAX_ROW; i++) {
    sheet.getCell(`G${i}`).dataValidation = { type: 'list', formulae: [typeList] };
    sheet.getCell(`H${i}`).dataValidation = { type: 'list', formulae: [methodList] };
  }

  // --- BLATT 2: LISTENVORLAGE (9 SPALTEN) ---
  const candSheet = workbook.addWorksheet('Listenvorlage');
  const candHeaders = [
    'Wahl Kennung',
    'Nr',
    'UID',
    'Liste / Schlüsselwort',
    'Vorname',
    'Nachname',
    'Mtr-Nr.',
    'Fakultät',
    'Studiengang',
  ];
  candSheet.getRow(1).values = candHeaders;
  candSheet.getRow(1).eachCell((c) => {
    c.font = { bold: true, color: { argb: FONT_WHITE } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HKA_BLACK } };
  });

  // Beispiel-Kandidat
  candSheet.getRow(2).values = [
    presetKey === 'generic' ? 'meine_wahl_01' : presetKey,
    1,
    'kand-001',
    config.listen === 1 ? 'Liste A' : 'Einzelkandidat',
    'Max',
    'Mustermann',
    '123456',
    'IWI',
    'Informatik',
  ];

  // --- BLATT 3: OPTIONSURABSTIMMUNG (WICHTIG FÜR SCHEMA) ---
  const optSheet = workbook.addWorksheet('OptionsUrabstimmung');
  optSheet.getRow(1).values = ['Wahlkennung', 'Nr', 'Name', 'Description'];
  optSheet.getRow(1).font = { bold: true };

  return workbook;
};

export const generateVoterTemplate = async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Wählerverzeichnis');
  sheet.columns = [{ width: 15 }, { width: 30 }, { width: 20 }, { width: 20 }, { width: 15 }];
  sheet.getRow(1).values = ['MatrikelNr', 'E-Mail', 'Vorname', 'Nachname', 'Fakultät'];
  sheet.getRow(1).eachCell((c) => {
    c.font = { bold: true, color: { argb: FONT_WHITE } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HKA_RED } };
  });
  sheet.getRow(2).values = ['123456', 'stud@h-ka.de', 'Erika', 'Mustermann', 'IWI'];
  return workbook;
};

export const getAvailablePresets = async () => {
  const allPresets = await loadAllPresets();
  const internalKeys = Object.keys(INTERNAL_PRESETS);
  const result = { internal: [], external: [] };
  Object.keys(allPresets).forEach((key) => {
    const preset = { key, info: allPresets[key].info };
    if (internalKeys.includes(key)) result.internal.push(preset);
    else result.external.push(preset);
  });
  return result;
};
