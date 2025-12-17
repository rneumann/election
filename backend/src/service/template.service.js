import ExcelJS from 'exceljs';
import { logger } from '../conf/logger/logger.js';

// --- KONSTANTEN FÜR FARBEN ---
const HKA_RED = 'FFE30613';
const HKA_BLACK = 'FF000000';
const HKA_GREY = 'FFEEEEEE';
const FONT_WHITE = 'FFFFFFFF';

// --- KONSTANTEN FÜR WAHL-BEGRIFFE (Vermeidet Duplikate) ---
const TYPE_VERHAELTNIS = 'Verhältniswahl';
const TYPE_MEHRHEIT = 'Mehrheitswahl';
const TYPE_URABSTIMMUNG = 'Urabstimmung';

const METHOD_SAINTE_LAGUE = 'Sainte-Laguë';
const METHOD_HARE_NIEMEYER = 'Hare-Niemeyer';
const METHOD_SIMPLE_MAJORITY = 'Einfache Mehrheit';
const METHOD_ABSOLUTE_MAJORITY = 'Absolute Mehrheit';
const METHOD_YES_NO = 'Ja/Nein/Enthaltung';

// --- KONSTANTEN FÜR LAYOUT & LOGIK (Vermeidet Magic Numbers) ---
const ROW_START_DATA = 8;
const VALIDATION_MAX_ROW = 100;
const DEFAULT_DURATION_DAYS = 14;
const COL_WIDTH_SMALL = 10;
const COL_WIDTH_MEDIUM = 15;
const COL_WIDTH_LARGE = 20;
const COL_WIDTH_XLARGE = 30;
const COL_WIDTH_XXLARGE = 40;

// --- HKA WAHL-VOREINSTELLUNGEN (PRESETS) ---
// Basierend auf "Wahlarten_Ueberblick_2.docx"
const ELECTION_PRESETS = {
  // Standard (Leer)
  generic: {
    info: 'Gremienwahl Beispiel',
    type: '',
    method: '',
    listen: 1,
    seats: null,
    votes: null,
    kum: null,
  },
  // 1.1 Studierendenparlament (Verhältniswahl)
  stupa_verhaeltnis: {
    info: 'Studierendenparlament (Verhältniswahl)',
    type: TYPE_VERHAELTNIS,
    method: METHOD_SAINTE_LAGUE,
    listen: 1,
    seats: null,
    votes: null,
    kum: 0,
  },
  // 1.2 Studierendenparlament (Mehrheitswahl)
  stupa_mehrheit: {
    info: 'Studierendenparlament (Mehrheitswahl)',
    type: TYPE_MEHRHEIT,
    method: METHOD_SIMPLE_MAJORITY,
    listen: 0,
    seats: null,
    votes: null,
    kum: null,
  },
  // 2. Fachschaftsvorstand
  fachschaft: {
    info: 'Wahl des Fachschaftsvorstands',
    type: TYPE_MEHRHEIT,
    method: METHOD_ABSOLUTE_MAJORITY,
    listen: 0,
    seats: null,
    votes: 1,
    kum: 0,
  },
  // 4. Senat (Verhältniswahl)
  senat_verhaeltnis: {
    info: 'Senat (Verhältniswahl)',
    type: TYPE_VERHAELTNIS,
    method: METHOD_HARE_NIEMEYER,
    listen: 1,
    seats: null,
    votes: null,
    kum: 2,
  },
  // 5.2 Senat (Mehrheitswahl)
  senat_mehrheit: {
    info: 'Senat (Mehrheitswahl)',
    type: TYPE_MEHRHEIT,
    method: METHOD_SIMPLE_MAJORITY,
    listen: 0,
    seats: null,
    votes: null,
    kum: 2,
  },
  // 6.1 Fakultätsrat (Verhältniswahl)
  fakrat_verhaeltnis: {
    info: 'Fakultätsrat (Verhältniswahl)',
    type: TYPE_VERHAELTNIS,
    method: METHOD_HARE_NIEMEYER,
    listen: 1,
    seats: null,
    votes: null,
    kum: null,
  },
  // 6.2 Fakultätsrat (Mehrheitswahl)
  fakrat_mehrheit: {
    info: 'Fakultätsrat (Mehrheitswahl)',
    type: TYPE_MEHRHEIT,
    method: METHOD_SIMPLE_MAJORITY,
    listen: 0,
    seats: null,
    votes: null,
    kum: null,
  },
  // 3. Urabstimmung
  urabstimmung: {
    info: 'Urabstimmung',
    type: TYPE_URABSTIMMUNG,
    method: METHOD_YES_NO,
    listen: 0,
    seats: 1,
    votes: 1,
    kum: 0,
  },
  // 7. Wahl der Prorektoren
  prorektor: {
    info: 'Wahl der Prorektoren',
    type: TYPE_URABSTIMMUNG,
    method: METHOD_YES_NO,
    listen: 0,
    seats: 1,
    votes: 1,
    kum: 0,
  },
  // 8. & 10. Wahl der Dekane / Prodekane (1. Wahlgang)
  dekan_wahlgang1: {
    info: 'Wahl Dekan/Prodekan (1. Wahlgang)',
    type: TYPE_MEHRHEIT,
    method: METHOD_ABSOLUTE_MAJORITY,
    listen: 0,
    seats: 1,
    votes: 1,
    kum: 0,
  },
  // Wahl der Dekane (2. Wahlgang)
  dekan_wahlgang2: {
    info: 'Wahl Dekan/Prodekan (2. Wahlgang)',
    type: TYPE_MEHRHEIT,
    method: METHOD_SIMPLE_MAJORITY,
    listen: 0,
    seats: 1,
    votes: 1,
    kum: 0,
  },
  // 11. Professorenwahl zum Senat
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

/**
 * Erstellt das Template, optional mit vorausgefüllten Daten eines Presets.
 *
 * @param {string} presetKey - Der Schlüssel des gewählten Presets (z.B. 'stupa_verhaeltnis')
 * @returns {Promise<ExcelJS.Workbook>} Das generierte Excel-Workbook
 */
export const generateElectionTemplate = async (presetKey = 'generic') => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'HKA E-Voting System';

  // Konfiguration laden (Fallback auf Generic)
  // eslint-disable-next-line security/detect-object-injection
  const config = ELECTION_PRESETS[presetKey] || ELECTION_PRESETS.generic;

  // --- BLATT 1: WAHLEN ---
  const sheet = workbook.addWorksheet('Wahlen', { views: [{ showGridLines: false }] });

  sheet.columns = [
    { width: COL_WIDTH_LARGE }, // A: Kennung
    { width: COL_WIDTH_XXLARGE }, // B: Info
    { width: COL_WIDTH_MEDIUM }, // C: Listen
    { width: COL_WIDTH_LARGE }, // D: Plätze
    { width: COL_WIDTH_MEDIUM }, // E: Stimmen
    { width: COL_WIDTH_MEDIUM }, // F: Max Kum
    { width: COL_WIDTH_XLARGE }, // G: Wahltyp
    { width: COL_WIDTH_XLARGE }, // H: Zählverfahren
  ];

  // Header & Styling
  sheet.mergeCells('A1:H2');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'Gremienwahlen - Konfiguration';
  titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: FONT_WHITE } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HKA_RED } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // Metadaten
  const d3 = sheet.getCell('D3');
  d3.value = 'Wahlzeitraum von:';
  d3.font = { bold: true };
  sheet.getCell('E3').value = new Date(); // Heute

  const d4 = sheet.getCell('D4');
  d4.value = 'bis:';
  d4.font = { bold: true };
  // Datum + 14 Tage
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + DEFAULT_DURATION_DAYS);
  sheet.getCell('E4').value = futureDate;

  // Spalten-Header
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
    presetKey === 'generic' ? 'wahl_kennung' : presetKey, // A: Kennung
    config.info, // B: Info
    config.listen, // C: Listen
    config.seats, // D: Plätze (bleibt leer, wenn null)
    config.votes, // E: Stimmen (bleibt leer, wenn null)
    config.kum, // F: Kumulieren (bleibt leer, wenn null)
    config.type, // G: Wahltyp
    config.method, // H: Verfahren
  ];

  // Strings für Dropdowns vorbereiten
  const typeList = `"${TYPE_VERHAELTNIS},${TYPE_MEHRHEIT},${TYPE_URABSTIMMUNG}"`;
  const methodList = `"${METHOD_SAINTE_LAGUE},${METHOD_HARE_NIEMEYER},${METHOD_SIMPLE_MAJORITY},${METHOD_ABSOLUTE_MAJORITY},${METHOD_YES_NO}"`;

  // Dropdowns für Validierung
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
    { width: COL_WIDTH_LARGE },
    { width: COL_WIDTH_MEDIUM },
    { width: COL_WIDTH_MEDIUM },
    { width: COL_WIDTH_LARGE },
    { width: COL_WIDTH_LARGE },
    { width: COL_WIDTH_LARGE },
    { width: COL_WIDTH_XLARGE },
    { width: COL_WIDTH_SMALL },
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

/**
 * Erstellt das Template für das Wählerverzeichnis.
 *
 * @returns {Promise<ExcelJS.Workbook>} Das generierte Excel-Workbook
 */
export const generateVoterTemplate = async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'HKA E-Voting System';

  const sheet = workbook.addWorksheet('Wählerverzeichnis');

  sheet.columns = [
    { width: COL_WIDTH_MEDIUM },
    { width: COL_WIDTH_XLARGE },
    { width: COL_WIDTH_LARGE },
    { width: COL_WIDTH_LARGE },
    { width: COL_WIDTH_MEDIUM },
  ];

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
