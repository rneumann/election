import ExcelJS from 'exceljs';
import { logger } from '../conf/logger/logger.js';

// HKA Farben
const HKA_RED = 'FFE30613';
const HKA_BLACK = 'FF000000';
const HKA_GREY = 'FFEEEEEE';

// --- HKA WAHL-VOREINSTELLUNGEN (PRESETS) ---
// Basierend auf "Wahlarten_Ueberblick_2.docx"
const ELECTION_PRESETS = {
  // Standard (Leer)
  generic: {
    info: 'Gremienwahl Beispiel',
    type: '',
    method: '',
    listen: 1,
    seats: 7,
    votes: 7,
    kum: 3,
  },
  // 1.1 Studierendenparlament (Verhältniswahl) [cite: 105]
  stupa_verhaeltnis: {
    info: 'Studierendenparlament (Verhältniswahl)',
    type: 'Verhältniswahl',
    method: 'Sainte-Laguë', // [cite: 106]
    listen: 1, // Listenwahl
    seats: 25, // Beispielwert, Admin muss prüfen
    votes: 25,
    kum: 0, // Keine Kumulierung bei StuPa Verhältniswahl laut Dok
  },
  // 1.2 Studierendenparlament (Mehrheitswahl) [cite: 108]
  stupa_mehrheit: {
    info: 'Studierendenparlament (Mehrheitswahl)',
    type: 'Mehrheitswahl',
    method: 'Einfache Mehrheit', // Höchststimmenprinzip [cite: 109]
    listen: 0, // Keine Listenbindung
    seats: 25,
    votes: 25,
    kum: 1,
  },
  // 2. Fachschaftsvorstand [cite: 111]
  fachschaft: {
    info: 'Wahl des Fachschaftsvorstands',
    type: 'Mehrheitswahl',
    method: 'Absolute Mehrheit', // [cite: 112]
    listen: 0,
    seats: 1,
    votes: 1, // Stimmen pro Person: 1
    kum: 0,
  },
  // 4. Senat (Verhältniswahl) [cite: 116]
  senat_verhaeltnis: {
    info: 'Senat (Verhältniswahl)',
    type: 'Verhältniswahl',
    method: 'Hare-Niemeyer', // [cite: 117]
    listen: 1,
    seats: 3,
    votes: 3,
    kum: 2, // "Maximal 2 Stimmen pro Bewerber" [cite: 117]
  },
  // 5.2 Senat (Mehrheitswahl) [cite: 124]
  senat_mehrheit: {
    info: 'Senat (Mehrheitswahl)',
    type: 'Mehrheitswahl',
    method: 'Einfache Mehrheit', // Höchststimmenprinzip
    listen: 0,
    seats: 3,
    votes: 3,
    kum: 2,
  },
  // 6.1 Fakultätsrat (Verhältniswahl) [cite: 131]
  fakrat_verhaeltnis: {
    info: 'Fakultätsrat (Verhältniswahl)',
    type: 'Verhältniswahl',
    method: 'Hare-Niemeyer', // [cite: 132]
    listen: 1,
    seats: 7,
    votes: 7,
    kum: 2, // Analog Senat meistens
  },
  // 3. Urabstimmung [cite: 113]
  urabstimmung: {
    info: 'Urabstimmung',
    type: 'Urabstimmung',
    method: 'Ja/Nein/Enthaltung',
    listen: 0,
    seats: 1,
    votes: 1,
    kum: 0,
  },
};

/**
 * Erstellt das Template, optional mit vorausgefüllten Daten eines Presets.
 * @param {string} presetKey - Der Schlüssel des gewählten Presets (z.B. 'stupa_verhaeltnis')
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

  // Header & Styling (wie gehabt)
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
    config.seats, // D: Plätze
    config.votes, // E: Stimmen
    config.kum, // F: Kumulieren
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

  // Beispiel-Kandidat passend zur Kennung
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
 */
export const generateVoterTemplate = async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'HKA E-Voting System';

  const sheet = workbook.addWorksheet('Wählerverzeichnis');

  // Spaltenbreiten
  sheet.columns = [
    { width: 15 }, // A: MatrikelNr / ID
    { width: 30 }, // B: E-Mail
    { width: 20 }, // C: Vorname
    { width: 20 }, // D: Nachname
    { width: 15 }, // E: Fakultät
  ];

  // Header
  const headers = ['MatrikelNr', 'E-Mail', 'Vorname', 'Nachname', 'Fakultät'];
  const headerRow = sheet.getRow(1);
  headerRow.values = headers;

  // HKA Style Header
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE30613' } }; // HKA Rot
  });

  // Beispiel-Daten
  sheet.getRow(2).values = ['123456', 'muma1011@h-ka.de', 'Max', 'Mustermann', 'IWI'];
  sheet.getRow(3).values = ['654321', 'susi.muster@h-ka.de', 'Susi', 'Sorglos', 'MMT'];

  logger.info('Wähler-Template erfolgreich generiert');
  return workbook;
};
