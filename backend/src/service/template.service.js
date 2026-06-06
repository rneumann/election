import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';
import { logger } from '../conf/logger/logger.js';
import { loadOrganisation, loadDocumentStructure, loadInternalPresets, headerNames } from '../conf/config-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.join(__dirname, '../../data/election_presets.json');

// Interne Presets werden jetzt aus config/election-presets.{profile}.json geladen
// (via loadInternalPresets() im config-loader). Kein Hardcode mehr nötig.

// ── Preset-Loader ─────────────────────────────────────────────────────────────

/**
 * Konvertiert ein Preset im neuen API-Format (snake_case-Felder) in das
 * interne Anzeigeformat (type/method als lesbare Strings).
 *
 * @param {object} preset - Preset im neuen Format mit Feldern wie `counting_method`,
 *   `votes_per_ballot`, `allow_cumulation`, `candidates_per_list`
 * @returns {{ info: string, type: string, method: string, listen: number,
 *             seats: number|null, votes: number, kum: number }} Preset im internen Format
 */
const mapNewFormatToOld = (preset) => {
  const countingMethod = preset.counting_method || 'highest_votes';
  const votesPerBallot = preset.votes_per_ballot || 1;
  let type = 'Mehrheitswahl', method = 'Einfache Mehrheit';
  let seats = preset.candidates_per_list || null, votes = votesPerBallot, listen = 0;
  let kum = preset.allow_cumulation ? votesPerBallot : 0;
  if (countingMethod === 'referendum')             { type = 'Urabstimmung';   method = 'Ja/Nein/Enthaltung'; seats = 1; votes = 1; }
  else if (countingMethod.includes('sainte'))      { type = 'Verhältniswahl'; method = 'Sainte-Laguë';       listen = 1; }
  else if (countingMethod === 'hare_niemeyer')     { type = 'Verhältniswahl'; method = 'Hare-Niemeyer';      listen = 1; }
  else if (preset.absolute_majority_required)      { method = 'Absolute Mehrheit'; }
  return { info: preset.info || 'Wahl', type, method, listen, seats, votes, kum };
};

/**
 * Lädt alle verfügbaren Wahlvorlagen: interne Presets aus der Profil-Config
 * (`config/election-presets.{profile}.json`) sowie externe Presets aus
 * `data/election_presets.json`. Externe Presets im neuen API-Format werden
 * automatisch konvertiert und überschreiben gleichnamige interne Presets.
 *
 * @returns {Promise<Record<string, object>>} Kombiniertes Preset-Objekt (key → Preset)
 */
const loadAllPresets = async () => {
  const internalPresets = await loadInternalPresets();
  let customPresets = {};
  try {
    const data = await fs.readFile(CONFIG_PATH, 'utf-8');
    const rawCustom = JSON.parse(data);
    Object.entries(rawCustom).forEach(([key, preset]) => {
      /* eslint-disable security/detect-object-injection */
      customPresets[key] = preset.counting_method ? mapNewFormatToOld(preset) : preset;
      /* eslint-enable security/detect-object-injection */
    });
  } catch { logger.debug('Keine externe Konfiguration gefunden.'); }
  return { ...internalPresets, ...customPresets };
};

// ── Hilfsfunktionen ───────────────────────────────────────────────────────────

/** Standard-Ausrichtung für alle Tabellenzellen. */
const defaultAlignment = { horizontal: 'center', vertical: 'middle' };

/**
 * Wendet den Header-Stil (weiße Schrift auf dunklem Hintergrund) auf eine ExcelJS-Zeile an.
 *
 * @param {ExcelJS.Row} row - Die zu stylende Zeile
 * @param {{ primary: string, dark: string, white: string }} colors - ARGB-Farbwerte aus der Org-Config
 */
const applyHeaderStyle = (row, colors) => {
  row.eachCell((c) => {
    c.font = { bold: true, color: { argb: colors.white } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.dark } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });
};

/**
 * Erzeugt ExcelJS-Spaltendefinitionen aus den Spalten-Definitionen der Config.
 * Nutzt `width` aus der Config, Fallback 15.
 *
 * @param {Array<{ width?: number }>} colDefs - Spaltendefinitionen aus document-structure.json
 * @returns {Array<{ width: number, style: object }>} ExcelJS-kompatible Spaltendefinitionen
 */
const buildSheetColumns = (colDefs) =>
  colDefs.map((c) => ({ width: c.width ?? 15, style: { alignment: defaultAlignment } }));

/**
 * Formatiert ein Array von Werten als Excel-Dropdown-Liste.
 *
 * @param {string[]} values - Erlaubte Werte
 * @returns {string} ExcelJS-Formulae-String, z.B. `"Wert1,Wert2,Wert3"`
 */
const buildValidationList = (values) => `"${values.join(',')}"`;

/**
 * Fügt ein Kandidaten- oder Urabstimmungsblatt zum XLSX-Workbook hinzu.
 * Der Blattname entspricht der Wahlkennung. Spaltenstruktur und Breiten
 * werden aus der Dokumentstruktur-Config gelesen.
 * Enthält eine Beispieldatenzeile zur Orientierung.
 *
 * @param {ExcelJS.Workbook} workbook - Ziel-Workbook
 * @param {string} sheetName - Blattname (= Wahlkennung)
 * @param {{ type: string, listen: number }} preset - Preset-Konfiguration der Wahl
 * @param {object} docs - Dokumentstruktur aus `loadDocumentStructure()`
 * @param {{ primary: string, dark: string, white: string }} colors - Farbwerte aus der Org-Config
 */
const addCandidateSheet = (workbook, sheetName, preset, docs, colors) => {
  const isReferendum = preset.type === 'Urabstimmung';
  const sheetDef = isReferendum ? docs.referendum : docs.candidates;
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = buildSheetColumns(sheetDef.columns);
  const headers = headerNames(sheetDef);
  sheet.getRow(1).values = headers;
  applyHeaderStyle(sheet.getRow(1), colors);

  if (isReferendum) {
    sheet.getRow(2).values = [1, 'Ja', 'Zustimmung zur Vorlage'];
    sheet.getRow(3).values = [2, 'Nein', 'Ablehnung der Vorlage'];
  } else {
    sheet.getRow(2).values = [
      1, 'kand-001',
      preset.listen === 1 ? 'Liste A' : 'Einzelkandidat',
      'Max', 'Mustermann', '123456', 'IWI', 'Informatik',
    ];
  }

  const maxRow = 100;
  for (let i = 2; i <= maxRow; i++) {
    const row = sheet.getRow(i);
    for (let col = 1; col <= sheetDef.columns.length; col++) {
      row.getCell(col).style = { alignment: defaultAlignment, numFmt: '@' };
    }
  }
};

/**
 * Richtet das "Wahlen"-Blatt eines XLSX-Workbooks vollständig ein:
 * Titel-Banner, Meta-Zeilen (Wahlzeitraum), Header-Zeile und
 * Dropdown-Validierungen für Wahltyp und Zählverfahren.
 * Spaltenstruktur und Farben stammen aus den Config-Dateien.
 *
 * @param {ExcelJS.Worksheet} sheet - Das zu konfigurierende Worksheet
 * @param {object} org - Organisationskonfiguration aus `loadOrganisation()`
 * @param {object} docs - Dokumentstruktur aus `loadDocumentStructure()`
 * @param {string} startDate - Startdatum als lokaler String (TT.MM.JJJJ)
 * @param {string|null} startTime - Startzeit als "HH:MM" oder null (→ Standardwert aus Config)
 * @param {string} endDate - Enddatum als lokaler String (TT.MM.JJJJ)
 * @param {string|null} endTime - Endzeit als "HH:MM" oder null (→ Standardwert aus Config)
 * @returns {{ ROW_DATA: number, typeColLetter: string, methodColLetter: string }}
 *   Index der ersten Datenzeile und Spaltenbuchstaben der validierten Spalten
 */
const setupWahlenSheet = (sheet, org, docs, startDate, startTime, endDate, endTime) => {
  const { colors, document: docCfg } = org;
  const meta = docs.elections.metaRows;
  const colDefs = docs.elections.columns;
  const colCount = colDefs.length;
  const ROW_HEADER   = docCfg.headerRowIndex;
  const ROW_DATA     = docCfg.dataStartRowIndex;
  const VALIDATION_MAX = docCfg.validationMaxRow;

  sheet.columns = buildSheetColumns(colDefs);

  // Titel-Banner über alle Spalten
  sheet.mergeCells(`A1:${String.fromCharCode(64 + colCount)}2`);
  const title = sheet.getCell('A1');
  title.value = `${docCfg.titlePrefix} - Wahlkonfiguration`;
  title.font = { size: 16, bold: true, color: { argb: colors.white } };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.primary } };
  title.alignment = { vertical: 'middle', horizontal: 'center' };

  // Meta-Zeilen (Zeilen 3–4): Wahlzeitraum mit Datum und Uhrzeit
  const setCell = (addr, value, align = 'left') => {
    const c = sheet.getCell(addr);
    c.value = value;
    c.alignment = { horizontal: align, vertical: 'middle' };
    c.numFmt = '@';
  };
  setCell('B3', meta.start.marker,     'right');
  setCell('C3', meta.start.dateLabel,  'right');
  setCell('D3', startDate,             'left');
  setCell('E3', meta.start.timeLabel,  'right');
  setCell('F3', startTime || meta.start.defaultTime, 'left');
  setCell('B4', meta.end.marker,       'right');
  setCell('C4', meta.end.dateLabel,    'right');
  setCell('D4', endDate,               'left');
  setCell('E4', meta.end.timeLabel,    'right');
  setCell('F4', endTime || meta.end.defaultTime, 'left');

  // Header-Zeile (Zeile 7 per Default aus Config)
  const hRow = sheet.getRow(ROW_HEADER);
  hRow.values = headerNames(docs.elections);
  applyHeaderStyle(hRow, colors);

  // Dropdown-Validierungen und Text-Formatierung für alle Datenzeilen
  const vals = docs.validations;
  const typeColIdx   = colDefs.findIndex((c) => c.validation === 'electionTypes')   + 1;
  const methodColIdx = colDefs.findIndex((c) => c.validation === 'countingMethods') + 1;
  const typeColLetter   = String.fromCharCode(64 + typeColIdx);
  const methodColLetter = String.fromCharCode(64 + methodColIdx);

  for (let i = ROW_DATA; i <= VALIDATION_MAX; i++) {
    if (typeColIdx)   sheet.getCell(`${typeColLetter}${i}`).dataValidation   = { type: 'list', formulae: [buildValidationList(vals.electionTypes)]   };
    if (methodColIdx) sheet.getCell(`${methodColLetter}${i}`).dataValidation = { type: 'list', formulae: [buildValidationList(vals.countingMethods)] };
    const row = sheet.getRow(i);
    for (let col = 1; col <= colCount; col++) {
      row.getCell(col).style = { alignment: defaultAlignment, numFmt: '@' };
    }
  }

  return { ROW_DATA, typeColLetter, methodColLetter };
};

// ── Öffentliche Generator-Funktionen ──────────────────────────────────────────

/**
 * Generiert eine leere XLSX-Wahlvorlage für einen Preset-Schlüssel.
 * Das Workbook enthält das "Wahlen"-Blatt mit einer Beispielzeile sowie
 * ein Kandidatenblatt für die Beispielwahl.
 *
 * @param {string} [presetKey='generic'] - Schlüssel eines internen oder externen Presets
 * @returns {Promise<ExcelJS.Workbook>} Fertiges ExcelJS-Workbook zum Streamen
 */
export const generateElectionTemplate = async (presetKey = 'generic') => {
  const [allPresets, org, docs] = await Promise.all([loadAllPresets(), loadOrganisation(), loadDocumentStructure()]);
  /* eslint-disable security/detect-object-injection */
  const config = Object.hasOwn(allPresets, presetKey) ? allPresets[presetKey] : allPresets.generic;
  /* eslint-enable security/detect-object-injection */

  const startDate = new Date().toLocaleDateString('de-DE');
  const future = new Date();
  future.setDate(future.getDate() + (org.document.electionDurationDays ?? 14));
  const endDate = future.toLocaleDateString('de-DE');

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(docs.elections.sheetName, { views: [{ showGridLines: false }] });

  setupWahlenSheet(sheet, org, docs, startDate, null, endDate, null);

  const ROW_DATA = org.document.dataStartRowIndex;
  const exampleKey = presetKey === 'generic' ? 'meine_wahl_01' : presetKey;
  const dataRow = sheet.getRow(ROW_DATA);
  dataRow.values = [
    exampleKey, config.info, config.listen ?? 1,
    config.seats ?? '', config.votes ?? '', config.kum ?? '',
    config.type ?? '', config.method ?? '', 0,
  ];
  dataRow.eachCell((c) => { c.alignment = defaultAlignment; });

  addCandidateSheet(workbook, exampleKey, config, docs, org.colors);
  return workbook;
};

/**
 * Generiert ein ausgefülltes XLSX-Workbook aus konkreten Wahldaten.
 * Für jede Wahl wird ein eigenes Kandidatenblatt angelegt (Blattname = Kennung).
 * Wird sowohl für den Template-Builder als auch für den DB-Export verwendet.
 *
 * @param {{ startDate: string, startTime?: string, endDate: string, endTime?: string,
 *           elections: Array<{ kennung: string, info: string, listen: number,
 *             plaetze: number, stimmen: number, kum: number,
 *             wahltyp: string, zaehlverfahren: string, freieplaetze: number }> }} data
 * @returns {Promise<ExcelJS.Workbook>} Fertiges ExcelJS-Workbook zum Streamen
 */
export const generateElectionTemplateFromData = async (data) => {
  const [org, docs] = await Promise.all([loadOrganisation(), loadDocumentStructure()]);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(docs.elections.sheetName, { views: [{ showGridLines: false }] });

  const { ROW_DATA } = setupWahlenSheet(
    sheet, org, docs, data.startDate, data.startTime, data.endDate, data.endTime,
  );

  data.elections.forEach((e, idx) => {
    const row = sheet.getRow(ROW_DATA + idx);
    row.values = [e.kennung, e.info, e.listen ?? 0, e.plaetze, e.stimmen, e.kum ?? 0, e.wahltyp, e.zaehlverfahren, e.freieplaetze ?? 0];
    row.eachCell((c) => { c.alignment = defaultAlignment; });
    addCandidateSheet(workbook, e.kennung, { type: e.wahltyp, listen: e.listen }, docs, org.colors);
  });

  return workbook;
};

/**
 * Generiert ODS-Sheet-Definitionen aus konkreten Wahldaten.
 * Gibt eine Liste von Sheet-Objekten zurück, die von `streamOdsFile` verarbeitet werden.
 * Das erste Sheet ist immer "Wahlen", danach folgt je ein Kandidatenblatt pro Wahl.
 *
 * @param {{ startDate: string, startTime?: string, endDate: string, endTime?: string,
 *           elections: Array<{ kennung: string, info: string, listen: number,
 *             plaetze: number, stimmen: number, kum: number,
 *             wahltyp: string, zaehlverfahren: string, freieplaetze: number }> }} data
 * @returns {Promise<Array<{ name: string, headers: string[], metaRows?: any[][], rows: any[][] }>>}
 */
export const generateElectionTemplateOdsFromData = async (data) => {
  const docs = await loadDocumentStructure();
  const meta = docs.elections.metaRows;
  const wahlenHeaders = headerNames(docs.elections);
  const metaVon = [meta.start.marker, meta.start.dateLabel, data.startDate, meta.start.timeLabel, data.startTime || meta.start.defaultTime, '', '', '', ''];
  const metaBis = [meta.end.marker,   meta.end.dateLabel,   data.endDate,   meta.end.timeLabel,   data.endTime   || meta.end.defaultTime,   '', '', '', ''];

  const electionRows = data.elections.map((e) => [
    e.kennung, e.info, e.listen ?? 0, e.plaetze, e.stimmen, e.kum ?? 0, e.wahltyp, e.zaehlverfahren, e.freieplaetze ?? 0,
  ]);

  const sheets = [
    { name: docs.elections.sheetName, headers: wahlenHeaders, metaRows: [metaVon, metaBis], rows: electionRows },
  ];

  data.elections.forEach((e) => {
    const isReferendum = e.wahltyp === docs.validations.electionTypes[2];
    const sheetDef = isReferendum ? docs.referendum : docs.candidates;
    const candExample = isReferendum
      ? [1, 'Ja', 'Zustimmung zur Vorlage']
      : [1, 'kand-001', e.listen === 1 ? 'Liste A' : 'Einzelkandidat', 'Max', 'Mustermann', '123456', 'IWI', 'Informatik'];
    sheets.push({ name: e.kennung, headers: headerNames(sheetDef), rows: [candExample] });
  });

  return sheets;
};

/**
 * Generiert eine leere XLSX-Wählervorlage mit Beispieldatenzeile.
 * Spaltenstruktur und Breiten stammen aus der Dokumentstruktur-Config (voters).
 *
 * @returns {Promise<ExcelJS.Workbook>} Fertiges ExcelJS-Workbook zum Streamen
 */
export const generateVoterTemplate = async () => {
  const [org, docs] = await Promise.all([loadOrganisation(), loadDocumentStructure()]);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Wählerverzeichnis');
  sheet.columns = buildSheetColumns(docs.voters.columns);
  sheet.getRow(1).values = headerNames(docs.voters);
  applyHeaderStyle(sheet.getRow(1), org.colors);
  sheet.getRow(2).values = ['123456', 'stud@h-ka.de', 'Erika', 'Mustermann', 'IWI'];
  return workbook;
};

/**
 * Generiert eine leere ODS-Wahlvorlage für einen Preset-Schlüssel.
 * Gibt Sheet-Definitionen zurück, die von `streamOdsFile` verarbeitet werden.
 *
 * @param {string} [presetKey='generic'] - Schlüssel eines internen oder externen Presets
 * @returns {Promise<Array<{ name: string, headers: string[], metaRows?: any[][], rows: any[][] }>>}
 */
export const generateElectionTemplateOds = async (presetKey = 'generic') => {
  const [allPresets, docs] = await Promise.all([loadAllPresets(), loadDocumentStructure()]);
  /* eslint-disable security/detect-object-injection */
  const config = Object.hasOwn(allPresets, presetKey) ? allPresets[presetKey] : allPresets.generic;
  /* eslint-enable security/detect-object-injection */

  const startStr = new Date().toLocaleDateString('de-DE');
  const future = new Date();
  const org = await loadOrganisation();
  future.setDate(future.getDate() + (org.document.electionDurationDays ?? 14));
  const endStr = future.toLocaleDateString('de-DE');
  const exampleKey = presetKey === 'generic' ? 'meine_wahl_01' : presetKey;
  const isReferendum = config.type === docs.validations.electionTypes[2];
  const meta = docs.elections.metaRows;

  const wahlenSheet = {
    name: docs.elections.sheetName,
    headers: headerNames(docs.elections),
    metaRows: [
      [meta.start.marker, meta.start.dateLabel, startStr, meta.start.timeLabel, meta.start.defaultTime, '', '', '', ''],
      [meta.end.marker,   meta.end.dateLabel,   endStr,   meta.end.timeLabel,   meta.end.defaultTime,   '', '', '', ''],
    ],
    rows: [[
      exampleKey, config.info, config.listen ?? 1,
      config.seats ?? '', config.votes ?? '', config.kum ?? '',
      config.type ?? '', config.method ?? '', 0,
    ]],
  };

  const sheetDef = isReferendum ? docs.referendum : docs.candidates;
  const candDataRow = isReferendum
    ? [1, 'Ja', 'Zustimmung zur Vorlage']
    : [1, 'kand-001', config.listen === 1 ? 'Liste A' : 'Einzelkandidat', 'Max', 'Mustermann', '123456', 'IWI', 'Informatik'];

  return [
    wahlenSheet,
    { name: exampleKey, headers: headerNames(sheetDef), rows: [candDataRow] },
  ];
};

/**
 * Generiert eine leere ODS-Wählervorlage mit Beispieldatenzeile.
 * Spaltenstruktur stammt aus der Dokumentstruktur-Config (voters).
 *
 * @returns {Promise<Array<{ name: string, headers: string[], rows: any[][] }>>}
 */
export const generateVoterTemplateOds = async () => {
  const docs = await loadDocumentStructure();
  return [{
    name: 'Wählerverzeichnis',
    headers: headerNames(docs.voters),
    rows: [['123456', 'stud@h-ka.de', 'Erika', 'Mustermann', 'IWI']],
  }];
};

/**
 * Gibt alle verfügbaren Wahlvorlagen (Presets) kategorisiert zurück.
 * Interne Presets sind fest im Code definiert (HKA-Standard);
 * externe Presets werden aus `data/election_presets.json` geladen.
 *
 * @returns {Promise<{ internal: Array<{ key: string, info: string }>,
 *                     external: Array<{ key: string, info: string }> }>}
 */
export const getAvailablePresets = async () => {
  const [allPresets, internalPresets] = await Promise.all([loadAllPresets(), loadInternalPresets()]);
  const internalKeys = Object.keys(internalPresets);
  const result = { internal: [], external: [] };
  Object.keys(allPresets).forEach((key) => {
    /* eslint-disable security/detect-object-injection */
    const preset = { key, info: allPresets[key].info };
    /* eslint-enable security/detect-object-injection */
    (internalKeys.includes(key) ? result.internal : result.external).push(preset);
  });
  return result;
};
