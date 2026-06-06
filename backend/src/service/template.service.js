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
const ROW_HEADER = 7;
const ROW_START_DATA = 8;
const VALIDATION_MAX_ROW = 100;
const DEFAULT_DURATION_DAYS = 14;
const WAHLEN_COL_COUNT = 9;
const LISTEN_COL_COUNT = 8; // ohne "Wahl Kennung" (= Blattname)
const URABSTIMMUNG_COL_COUNT = 3; // Nr, Name, Description (kein Wahlkennung-Prefix)

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

/**
 * Maps new preset format to internal format.
 * @param {object} preset - The preset in new format
 * @returns {object} Preset in old internal format
 */
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

/**
 * Loads all presets from internal and external sources.
 * @returns {Promise<object>} Combined presets object
 */
const loadAllPresets = async () => {
  let customPresets = {};
  try {
    const data = await fs.readFile(CONFIG_PATH, 'utf-8');
    const rawCustom = JSON.parse(data);
    Object.entries(rawCustom).forEach(([key, preset]) => {
      // Objekt-Zugriff mit dynamischem key ist hier sicher, da key aus Object.entries stammt
      /* eslint-disable security/detect-object-injection */
      if (preset.counting_method) {
        customPresets[key] = mapNewFormatToOld(preset);
      } else {
        customPresets[key] = preset;
      }
      /* eslint-enable security/detect-object-injection */
    });
  } catch {
    logger.debug('Keine externe Konfiguration gefunden.');
  }
  return { ...INTERNAL_PRESETS, ...customPresets };
};

/**
 * Fügt ein Kandidatenblatt für eine Wahl zum Workbook hinzu.
 * Blattname = Wahlkennung. Spalten: Nr, UID, Liste/Schlüsselwort,
 * Vorname, Nachname, Mtr-Nr., Fakultät, Studiengang.
 * Bei Urabstimmungen: Nr, Name, Description.
 * @param {ExcelJS.Workbook} workbook
 * @param {string} sheetName - Wahlkennung (= Blattname)
 * @param {object} config - Preset-Konfiguration
 * @param {object} defaultAlignment
 */
const addCandidateSheet = (workbook, sheetName, config, defaultAlignment) => {
  const isReferendum = config.type === 'Urabstimmung';
  const sheet = workbook.addWorksheet(sheetName);

  if (isReferendum) {
    sheet.columns = [
      { width: 8, style: { alignment: defaultAlignment } }, // A: Nr
      { width: 25, style: { alignment: defaultAlignment } }, // B: Name
      { width: 50, style: { alignment: defaultAlignment } }, // C: Description
    ];
    sheet.getRow(1).values = ['Nr', 'Name', 'Description'];
    sheet.getRow(2).values = [1, 'Ja', 'Zustimmung zur Vorlage'];
    sheet.getRow(3).values = [2, 'Nein', 'Ablehnung der Vorlage'];
  } else {
    sheet.columns = [
      { width: 8, style: { alignment: defaultAlignment } }, // A: Nr
      { width: 15, style: { alignment: defaultAlignment } }, // B: UID
      { width: 25, style: { alignment: defaultAlignment } }, // C: Liste / Schlüsselwort
      { width: 15, style: { alignment: defaultAlignment } }, // D: Vorname
      { width: 15, style: { alignment: defaultAlignment } }, // E: Nachname
      { width: 12, style: { alignment: defaultAlignment } }, // F: Mtr-Nr.
      { width: 12, style: { alignment: defaultAlignment } }, // G: Fakultät
      { width: 18, style: { alignment: defaultAlignment } }, // H: Studiengang
    ];
    sheet.getRow(1).values = [
      'Nr',
      'UID',
      'Liste / Schlüsselwort',
      'Vorname',
      'Nachname',
      'Mtr-Nr.',
      'Fakultät',
      'Studiengang',
    ];
    sheet.getRow(2).values = [
      1,
      'kand-001',
      config.listen === 1 ? 'Liste A' : 'Einzelkandidat',
      'Max',
      'Mustermann',
      '123456',
      'IWI',
      'Informatik',
    ];
  }

  sheet.getRow(1).eachCell((c) => {
    c.font = { bold: true, color: { argb: FONT_WHITE } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HKA_BLACK } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  const colCount = isReferendum ? URABSTIMMUNG_COL_COUNT : LISTEN_COL_COUNT;
  for (let i = 2; i <= VALIDATION_MAX_ROW; i++) {
    const row = sheet.getRow(i);
    for (let col = 1; col <= colCount; col++) {
      row.getCell(col).style = { alignment: defaultAlignment, numFmt: '@' };
    }
  }
};

/**
 * Generiert das Wahl-Template im HKA-Design.
 * Die Struktur entspricht exakt dem vom Importer erwarteten Schema.
 * @param {string} presetKey - The preset key to use for template generation
 * @returns {Promise<ExcelJS.Workbook>} The generated Excel workbook
 */
export const generateElectionTemplate = async (presetKey = 'generic') => {
  const workbook = new ExcelJS.Workbook();
  const allPresets = await loadAllPresets();
  // Zugriff ist sicher: Object.hasOwn prüft Existenz, presetKey kommt vom Controller
  // eslint-disable-next-line security/detect-object-injection
  const config = Object.hasOwn(allPresets, presetKey) ? allPresets[presetKey] : allPresets.generic;

  // --- BLATT 1: WAHLEN ---
  const sheet = workbook.addWorksheet('Wahlen', { views: [{ showGridLines: false }] });
  const defaultAlignment = { horizontal: 'center', vertical: 'middle' };
  sheet.columns = [
    { width: 20, style: { alignment: defaultAlignment } }, // A: Kennung
    { width: 35, style: { alignment: defaultAlignment } }, // B: Info
    { width: 20, style: { alignment: defaultAlignment } }, // C: Listen
    { width: 17, style: { alignment: defaultAlignment } }, // D: Plätze
    { width: 20, style: { alignment: defaultAlignment } }, // E: Stimmen pro Zettel
    { width: 17, style: { alignment: defaultAlignment } }, // F: max. Kum.
    { width: 25, style: { alignment: defaultAlignment } }, // G: Wahltyp
    { width: 25, style: { alignment: defaultAlignment } }, // H: Zählverfahren
    { width: 15, style: { alignment: defaultAlignment } }, // I: Freie Plätze
  ];

  // Header Styling
  sheet.mergeCells('A1:I2');
  const title = sheet.getCell('A1');
  title.value = 'HKA E-Voting - Wahlkonfiguration';
  Object.assign(title, {
    font: { size: 16, bold: true, color: { argb: FONT_WHITE } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: HKA_RED } },
    alignment: { vertical: 'middle', horizontal: 'center' },
  });

  // Zeit-Meta
  // Spalten A-H: Wahlzeilen (8 Spalten) → I für Uhrzeit reservieren
  // Zeitraum-Meta: Datum in D, Uhrzeit in E
  const cellB3 = sheet.getCell('B3');
  cellB3.value = 'Wahlzeitraum von';
  cellB3.alignment = { horizontal: 'right', vertical: 'middle' };

  const cellC3 = sheet.getCell('C3');
  cellC3.value = 'Datum:';
  cellC3.alignment = { horizontal: 'right', vertical: 'middle' };

  const cellD3 = sheet.getCell('D3');
  cellD3.value = new Date().toLocaleDateString('de-DE');
  cellD3.alignment = { horizontal: 'left', vertical: 'middle' };
  cellD3.numFmt = '@'; // als Text, nicht als Excel-Datum

  const cellE3 = sheet.getCell('E3');
  cellE3.value = 'Uhrzeit (HH:MM):';
  cellE3.alignment = { horizontal: 'right', vertical: 'middle' };

  const cellF3 = sheet.getCell('F3');
  cellF3.value = '08:00';
  cellF3.alignment = { horizontal: 'left', vertical: 'middle' };
  cellF3.numFmt = '@';

  const cellB4 = sheet.getCell('B4');
  cellB4.value = 'bis';
  cellB4.alignment = { horizontal: 'right', vertical: 'middle' };

  const cellC4 = sheet.getCell('C4');
  cellC4.value = 'Datum:';
  cellC4.alignment = { horizontal: 'right', vertical: 'middle' };

  const future = new Date();
  future.setDate(future.getDate() + DEFAULT_DURATION_DAYS);
  const cellD4 = sheet.getCell('D4');
  cellD4.value = future.toLocaleDateString('de-DE');
  cellD4.alignment = { horizontal: 'left', vertical: 'middle' };
  cellD4.numFmt = '@';

  const cellE4 = sheet.getCell('E4');
  cellE4.value = 'Uhrzeit (HH:MM):';
  cellE4.alignment = { horizontal: 'right', vertical: 'middle' };

  const cellF4 = sheet.getCell('F4');
  cellF4.value = '18:00';
  cellF4.alignment = { horizontal: 'left', vertical: 'middle' };
  cellF4.numFmt = '@';

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
    'Freie Plätze',
  ];
  const hRow = sheet.getRow(ROW_HEADER);
  hRow.values = headerTitles;
  hRow.eachCell((c) => {
    c.font = { bold: true, color: { argb: FONT_WHITE } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HKA_BLACK } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // Datenzeile (Zeile 8)
  const dataRow = sheet.getRow(ROW_START_DATA);
  dataRow.values = [
    presetKey === 'generic' ? 'meine_wahl_01' : presetKey,
    config.info,
    config.listen ?? 1,
    config.seats ?? '',
    config.votes ?? '',
    config.kum ?? '',
    config.type ?? '',
    config.method ?? '',
    config.freeSlots ?? 0,
  ];
  // Zentriere alle Zellen in der Datenzeile
  dataRow.eachCell((cell) => {
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // Dropdown Validierung und Zentrierung für alle Datenzeilen
  const typeList = `"${TYPE_VERHAELTNIS},${TYPE_MEHRHEIT},${TYPE_URABSTIMMUNG}"`;
  const methodList = `"${METHOD_SAINTE_LAGUE},${METHOD_HARE_NIEMEYER},${METHOD_SIMPLE_MAJORITY},${METHOD_ABSOLUTE_MAJORITY},${METHOD_YES_NO}"`;
  for (let i = ROW_START_DATA; i <= VALIDATION_MAX_ROW; i++) {
    sheet.getCell(`G${i}`).dataValidation = { type: 'list', formulae: [typeList] };
    sheet.getCell(`H${i}`).dataValidation = { type: 'list', formulae: [methodList] };
    // Zentriere alle Zellen in jeder Zeile
    const row = sheet.getRow(i);
    for (let col = 1; col <= WAHLEN_COL_COUNT; col++) {
      const cell = row.getCell(col);
      cell.style = {
        alignment: defaultAlignment,
        numFmt: '@', // Als Text formatieren
      };
    }
  }

  // --- BLATT 2..N: Ein Kandidatenblatt pro Wahl (Blattname = Kennung) ---
  // Im Template wird ein Beispielblatt für die erste Wahl generiert.
  const exampleKey = presetKey === 'generic' ? 'meine_wahl_01' : presetKey;
  addCandidateSheet(workbook, exampleKey, config, defaultAlignment);

  return workbook;
};

/**
 * Generiert ein XLSX-Workbook aus benutzerdefinierten Wahldaten (kein Preset).
 * @param {{startDate:string, startTime:string, endDate:string, endTime:string, elections:Array}} data
 * @returns {Promise<ExcelJS.Workbook>}
 */
export const generateElectionTemplateFromData = async (data) => {
  const workbook = new ExcelJS.Workbook();
  const defaultAlignment = { horizontal: 'center', vertical: 'middle' };

  // --- Blatt 1: Wahlen ---
  const sheet = workbook.addWorksheet('Wahlen', { views: [{ showGridLines: false }] });
  sheet.columns = [
    { width: 20, style: { alignment: defaultAlignment } },
    { width: 35, style: { alignment: defaultAlignment } },
    { width: 20, style: { alignment: defaultAlignment } },
    { width: 17, style: { alignment: defaultAlignment } },
    { width: 20, style: { alignment: defaultAlignment } },
    { width: 17, style: { alignment: defaultAlignment } },
    { width: 25, style: { alignment: defaultAlignment } },
    { width: 25, style: { alignment: defaultAlignment } },
    { width: 15, style: { alignment: defaultAlignment } },
  ];

  sheet.mergeCells('A1:I2');
  const title = sheet.getCell('A1');
  title.value = 'HKA E-Voting - Wahlkonfiguration';
  Object.assign(title, {
    font: { size: 16, bold: true, color: { argb: FONT_WHITE } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: HKA_RED } },
    alignment: { vertical: 'middle', horizontal: 'center' },
  });

  const setCellText = (addr, value, align = 'left') => {
    const c = sheet.getCell(addr);
    c.value = value;
    c.alignment = { horizontal: align, vertical: 'middle' };
    c.numFmt = '@';
  };

  setCellText('B3', 'Wahlzeitraum von', 'right');
  setCellText('C3', 'Datum:', 'right');
  setCellText('D3', data.startDate, 'left');
  setCellText('E3', 'Uhrzeit (HH:MM):', 'right');
  setCellText('F3', data.startTime || '08:00', 'left');
  setCellText('B4', 'bis', 'right');
  setCellText('C4', 'Datum:', 'right');
  setCellText('D4', data.endDate, 'left');
  setCellText('E4', 'Uhrzeit (HH:MM):', 'right');
  setCellText('F4', data.endTime || '18:00', 'left');

  const headerTitles = ['Kennung', 'Info', 'Listen', 'Plätze', 'Stimmen pro Zettel', 'max. Kum.', 'Wahltyp', 'Zählverfahren', 'Freie Plätze'];
  const hRow = sheet.getRow(ROW_HEADER);
  hRow.values = headerTitles;
  hRow.eachCell((c) => {
    c.font = { bold: true, color: { argb: FONT_WHITE } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HKA_BLACK } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  const typeList = `"${TYPE_VERHAELTNIS},${TYPE_MEHRHEIT},${TYPE_URABSTIMMUNG}"`;
  const methodList = `"${METHOD_SAINTE_LAGUE},${METHOD_HARE_NIEMEYER},${METHOD_SIMPLE_MAJORITY},${METHOD_ABSOLUTE_MAJORITY},${METHOD_YES_NO}"`;
  for (let i = ROW_START_DATA; i <= VALIDATION_MAX_ROW; i++) {
    sheet.getCell(`G${i}`).dataValidation = { type: 'list', formulae: [typeList] };
    sheet.getCell(`H${i}`).dataValidation = { type: 'list', formulae: [methodList] };
    const row = sheet.getRow(i);
    for (let col = 1; col <= WAHLEN_COL_COUNT; col++) {
      row.getCell(col).style = { alignment: defaultAlignment, numFmt: '@' };
    }
  }

  data.elections.forEach((e, idx) => {
    const row = sheet.getRow(ROW_START_DATA + idx);
    row.values = [e.kennung, e.info, e.listen ?? 0, e.plaetze, e.stimmen, e.kum ?? 0, e.wahltyp, e.zaehlverfahren, e.freieplaetze ?? 0];
    row.eachCell((c) => { c.alignment = defaultAlignment; });
  });

  // Kandidatenblätter pro Wahl
  data.elections.forEach((e) => {
    const config = {
      type: e.wahltyp,
      listen: e.listen,
    };
    addCandidateSheet(workbook, e.kennung, config, defaultAlignment);
  });

  return workbook;
};

/**
 * Generiert ODS-Sheets aus benutzerdefinierten Wahldaten.
 * @param {{startDate:string, startTime:string, endDate:string, endTime:string, elections:Array}} data
 * @returns {Array<{name:string, headers:string[], rows:any[][]}>}
 */
export const generateElectionTemplateOdsFromData = (data) => {
  const wahlenHeaders = ['Kennung', 'Info', 'Listen', 'Plätze', 'Stimmen pro Zettel', 'max. Kum.', 'Wahltyp', 'Zählverfahren', 'Freie Plätze'];

  const metaVon = ['Wahlzeitraum von', 'Datum:', data.startDate, 'Uhrzeit (HH:MM):', data.startTime || '08:00', '', '', '', ''];
  const metaBis = ['bis', 'Datum:', data.endDate, 'Uhrzeit (HH:MM):', data.endTime || '18:00', '', '', '', ''];

  const electionRows = data.elections.map((e) => [
    e.kennung, e.info, e.listen ?? 0, e.plaetze, e.stimmen, e.kum ?? 0, e.wahltyp, e.zaehlverfahren, e.freieplaetze ?? 0,
  ]);

  const sheets = [
    { name: 'Wahlen', headers: wahlenHeaders, rows: [metaVon, metaBis, ...electionRows] },
  ];

  data.elections.forEach((e) => {
    const isReferendum = e.wahltyp === 'Urabstimmung';
    const candHeaders = isReferendum
      ? ['Nr', 'Name', 'Description']
      : ['Nr', 'UID', 'Liste / Schlüsselwort', 'Vorname', 'Nachname', 'Mtr-Nr.', 'Fakultät', 'Studiengang'];
    const candExample = isReferendum
      ? [1, 'Ja', 'Zustimmung zur Vorlage']
      : [1, 'kand-001', e.listen === 1 ? 'Liste A' : 'Einzelkandidat', 'Max', 'Mustermann', '123456', 'IWI', 'Informatik'];
    sheets.push({ name: e.kennung, headers: candHeaders, rows: [candExample] });
  });

  return sheets;
};

/**
 * Generates a voter template Excel workbook.
 * @returns {Promise<ExcelJS.Workbook>} The generated Excel workbook
 */
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

/**
 * Generates the election template as an ODS-ready sheet structure.
 * @param {string} presetKey
 * @returns {Promise<Array<{name: string, headers: string[], rows: any[][]}>>}
 */
export const generateElectionTemplateOds = async (presetKey = 'generic') => {
  const allPresets = await loadAllPresets();
  // eslint-disable-next-line security/detect-object-injection
  const config = Object.hasOwn(allPresets, presetKey) ? allPresets[presetKey] : allPresets.generic;

  const startStr = new Date().toLocaleDateString('de-DE');
  const future = new Date();
  future.setDate(future.getDate() + DEFAULT_DURATION_DAYS);
  const endStr = future.toLocaleDateString('de-DE');
  const exampleKey = presetKey === 'generic' ? 'meine_wahl_01' : presetKey;
  const isReferendum = config.type === 'Urabstimmung';

  // Blatt 1: Wahlen
  // Zeilen-Struktur entspricht generateElectionTemplate:
  // Zeile 1: Meta "Wahlzeitraum von" | Datum: | <Datum> | Uhrzeit: | <Zeit>
  // Zeile 2: "bis"                   | Datum: | <Datum> | Uhrzeit: | <Zeit>
  // Zeile 3: (leer — Abstand)
  // Zeile 4: Header
  // Zeile 5: Beispieldaten
  // Metadaten als erste zwei Datenzeilen (nach dem Header) — ODS-Reader
  // nimmt die erste nicht-leere Zeile als Header, daher dürfen Meta-Infos
  // NICHT vor dem Header stehen.
  // Kodierung: Kennung='Wahlzeitraum von', Listen=Datum, 'Stimmen pro Zettel'=Zeit
  //            Kennung='bis',              Listen=Datum, 'Stimmen pro Zettel'=Zeit
  const wahlenSheet = {
    name: 'Wahlen',
    headers: ['Kennung', 'Info', 'Listen', 'Plätze', 'Stimmen pro Zettel', 'max. Kum.', 'Wahltyp', 'Zählverfahren', 'Freie Plätze'],
    rows: [
      ['Wahlzeitraum von', 'Datum:', startStr, 'Uhrzeit (HH:MM):', '08:00', '', '', '', ''],
      ['bis',              'Datum:', endStr,   'Uhrzeit (HH:MM):', '18:00', '', '', '', ''],
      [
        exampleKey,
        config.info,
        config.listen ?? 1,
        config.seats ?? '',
        config.votes ?? '',
        config.kum ?? '',
        config.type ?? '',
        config.method ?? '',
        0,
      ],
    ],
  };

  // Blatt 2..N: ein Kandidatenblatt pro Wahl (Blattname = Wahlkennung)
  const candHeaders = isReferendum
    ? ['Nr', 'Name', 'Description']
    : ['Nr', 'UID', 'Liste / Schlüsselwort', 'Vorname', 'Nachname', 'Mtr-Nr.', 'Fakultät', 'Studiengang'];

  const candDataRow = isReferendum
    ? [1, 'Ja', 'Zustimmung zur Vorlage']
    : [1, 'kand-001', config.listen === 1 ? 'Liste A' : 'Einzelkandidat', 'Max', 'Mustermann', '123456', 'IWI', 'Informatik'];

  return [
    wahlenSheet,
    { name: exampleKey, headers: candHeaders, rows: [candDataRow] },
  ];
};

/**
 * Generates the voter template as an ODS-ready sheet structure.
 * @returns {Array<{name: string, headers: string[], rows: any[][]}>}
 */
export const generateVoterTemplateOds = () => [
  {
    name: 'Wählerverzeichnis',
    headers: ['MatrikelNr', 'E-Mail', 'Vorname', 'Nachname', 'Fakultät'],
    rows: [['123456', 'stud@h-ka.de', 'Erika', 'Mustermann', 'IWI']],
  },
];

/**
 * Returns all available presets categorized as internal or external.
 * @returns {Promise<{internal: Array, external: Array}>} Categorized presets
 */
export const getAvailablePresets = async () => {
  const allPresets = await loadAllPresets();
  const internalKeys = Object.keys(INTERNAL_PRESETS);
  const result = { internal: [], external: [] };
  Object.keys(allPresets).forEach((key) => {
    // eslint-disable-next-line security/detect-object-injection
    const presetInfo = allPresets[key];
    const preset = { key, info: presetInfo.info };
    if (internalKeys.includes(key)) {
      result.internal.push(preset);
    } else {
      result.external.push(preset);
    }
  });
  return result;
};
