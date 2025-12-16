import ExcelJS from 'exceljs';
import { logger } from '../conf/logger/logger.js';

// HKA Farben
const HKA_RED = 'FFE30613';
const HKA_BLACK = 'FF000000';
const HKA_GREY = 'FFEEEEEE';

// --- HKA WAHL-VOREINSTELLUNGEN (PRESETS) ---
// Basierend auf "Wahlarten_Ueberblick_2.docx"
// WICHTIG: null bedeutet "Kein Wert vorgegeben" -> Admin muss es ausfüllen!
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
  // 1.1 Studierendenparlament (Verhältniswahl) [cite: 105]
  stupa_verhaeltnis: {
    info: 'Studierendenparlament (Verhältniswahl)',
    type: 'Verhältniswahl',
    method: 'Sainte-Laguë', // [cite: 106]
    listen: 1, // Ja, Listenwahl
    seats: null, // Variabel ("Mindestens 3" laut Dok, kein fester Wert) [cite: 105]
    votes: null, // Hängt von Sitzanzahl ab
    kum: 0, // "keine Kumulierung" [cite: 106]
  },
  // 1.2 Studierendenparlament (Mehrheitswahl) [cite: 108]
  stupa_mehrheit: {
    info: 'Studierendenparlament (Mehrheitswahl)',
    type: 'Mehrheitswahl',
    method: 'Einfache Mehrheit', // "Höchststimmenprinzip" [cite: 109]
    listen: 0, // "Keine Listenbindung" [cite: 109]
    seats: null, // Variabel
    votes: null, // "so viele Stimmen wie Sitze" [cite: 109] -> Muss Admin eintragen
    kum: null, // Nicht explizit definiert (Standard bei Höchststimmen ist oft 1, aber besser leer lassen)
  },
  // 2. Fachschaftsvorstand [cite: 111]
  fachschaft: {
    info: 'Wahl des Fachschaftsvorstands',
    type: 'Mehrheitswahl', // "Persönlichkeitswahl" [cite: 111]
    method: 'Absolute Mehrheit', // 1. & 2. Wahlgang [cite: 112]
    listen: 0,
    seats: null, // Nicht definiert
    votes: 1, // "Stimmen pro Person: 1" [cite: 111]
    kum: 0, // Impliziert durch 1 Stimme
  },
  // 4. Senat (Verhältniswahl) [cite: 116]
  senat_verhaeltnis: {
    info: 'Senat (Verhältniswahl)',
    type: 'Verhältniswahl',
    method: 'Hare-Niemeyer', // [cite: 117]
    listen: 1,
    seats: null, // Hängt von der Gruppe ab
    votes: null, // "so viele Stimmen wie Sitze" [cite: 117]
    kum: 2, // "Maximal 2 Stimmen pro Bewerber" [cite: 117]
  },
  // 5.2 Senat (Mehrheitswahl) [cite: 124]
  senat_mehrheit: {
    info: 'Senat (Mehrheitswahl)',
    type: 'Mehrheitswahl', // "immer Mehrheitswahl" bei Hochschullehrern [cite: 124]
    method: 'Einfache Mehrheit', // "Höchststimmenprinzip"
    listen: 0,
    seats: null,
    votes: null,
    kum: 2, // "Maximal 2 Stimmen pro Bewerber" [cite: 124]
  },
  // 6.1 Fakultätsrat (Verhältniswahl) [cite: 131]
  fakrat_verhaeltnis: {
    info: 'Fakultätsrat (Verhältniswahl)',
    type: 'Verhältniswahl',
    method: 'Hare-Niemeyer', // [cite: 132]
    listen: 1, // Ja, Listenwahl
    seats: null,
    votes: null,
    kum: null, // Im Dokument für 6.1 nicht explizit definiert -> Leer lassen!
  },
  // 6.2 Fakultätsrat (Mehrheitswahl) - NEU ergänzt für Vollständigkeit [cite: 133]
  fakrat_mehrheit: {
    info: 'Fakultätsrat (Mehrheitswahl)',
    type: 'Mehrheitswahl',
    method: 'Einfache Mehrheit', // "Höchststimmenprinzip" [cite: 133]
    listen: 0,
    seats: null,
    votes: null,
    kum: null,
  },
  // 3. Urabstimmung [cite: 113]
  urabstimmung: {
    info: 'Urabstimmung',
    type: 'Urabstimmung',
    method: 'Ja/Nein/Enthaltung', // [cite: 113]
    listen: 0,
    seats: 1, // Sachfrage -> 1 Entscheidung
    votes: 1,
    kum: 0,
  },

  // 7. Wahl der Prorektoren [cite: 134]
  prorektor: {
    info: 'Wahl der Prorektoren',
    type: 'Urabstimmung',
    method: 'Ja/Nein/Enthaltung', // [cite: 134]
    listen: 0,
    seats: 1,
    votes: 1,
    kum: 0,
  },

  // 8. & 10. Wahl der Dekane / Prodekane (1. Wahlgang) [cite: 135]
  dekan_wahlgang1: {
    info: 'Wahl Dekan/Prodekan (1. Wahlgang)',
    type: 'Mehrheitswahl',
    method: 'Absolute Mehrheit', // [cite: 135]
    listen: 0,
    seats: 1,
    votes: 1,
    kum: 0,
  },

  // Wahl der Dekane (2. Wahlgang) [cite: 135]
  dekan_wahlgang2: {
    info: 'Wahl Dekan/Prodekan (2. Wahlgang)',
    type: 'Mehrheitswahl',
    method: 'Einfache Mehrheit', // [cite: 135]
    listen: 0,
    seats: 1,
    votes: 1,
    kum: 0,
  },

  // 11. Professorenwahl zum Senat [cite: 136]
  senat_professoren: {
    info: 'Wahl der Professoren in den Senat',
    type: 'Mehrheitswahl', // "Immer Mehrheitswahl" [cite: 136]
    method: 'Einfache Mehrheit', // "Höchststimmen"
    listen: 0, // "Keine Listen" [cite: 136]
    seats: 2, // EXPLIZIT: "Anzahl der Sitze: 2" [cite: 136]
    votes: 2, // "so viele wie Sitze" -> 2 [cite: 136]
    kum: 2, // "Maximal pro Kandidat: 2 Stimmen" [cite: 136]
  },
};

/*
 * Erstellt das Template, optional mit vorausgefüllten Daten eines Presets.
 * @param {string} presetKey - Der Schlüssel des gewählten Presets
 */
export const generateElectionTemplate = async (presetKey = 'generic') => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'HKA E-Voting System';

  // Konfiguration laden (Fallback auf Generic)
  const config = ELECTION_PRESETS[presetKey] || ELECTION_PRESETS['generic'];

  // --- BLATT 1: WAHLEN ---
  const sheet = workbook.addWorksheet('Wahlen', { views: [{ showGridLines: false }] });

  sheet.columns = [
    { width: 20 }, // A: Kennung
    { width: 40 }, // B: Info
    { width: 15 }, // C: Listen
    { width: 20 }, // D: Plätze
    { width: 15 }, // E: Stimmen
    { width: 15 }, // F: Max Kum
    { width: 30 }, // G: Wahltyp
    { width: 30 }, // H: Zählverfahren
  ];

  // Header & Styling
  sheet.mergeCells('A1:H2');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'Gremienwahlen - Konfiguration';
  titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
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
  sheet.getCell('E4').value = new Date(new Date().setDate(new Date().getDate() + 14)); // +14 Tage

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
  const row = sheet.getRow(8);
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

  // Dropdowns für Validierung
  for (let i = 8; i <= 100; i++) {
    sheet.getCell(`G${i}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"Verhältniswahl,Mehrheitswahl,Urabstimmung"'],
    };
    sheet.getCell(`H${i}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [
        '"Sainte-Laguë,Hare-Niemeyer,Einfache Mehrheit,Absolute Mehrheit,Ja/Nein/Enthaltung"',
      ],
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
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
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

// ... generateVoterTemplate (unverändert) ...
export const generateVoterTemplate = async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'HKA E-Voting System';

  const sheet = workbook.addWorksheet('Wählerverzeichnis');

  sheet.columns = [{ width: 15 }, { width: 30 }, { width: 20 }, { width: 20 }, { width: 15 }];

  const headers = ['MatrikelNr', 'E-Mail', 'Vorname', 'Nachname', 'Fakultät'];
  const headerRow = sheet.getRow(1);
  headerRow.values = headers;

  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HKA_RED } };
  });

  sheet.getRow(2).values = ['123456', 'muma1011@h-ka.de', 'Max', 'Mustermann', 'IWI'];

  return workbook;
};
