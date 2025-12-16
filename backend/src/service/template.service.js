import ExcelJS from 'exceljs';
import { logger } from '../conf/logger/logger.js';

// HKA Corporate Design Farben
const HKA_RED = 'FFE30613';
const HKA_BLACK = 'FF000000';
const HKA_GREY = 'FFEEEEEE';

/**
 * Erstellt das "Gremienwahlen" Template dynamisch.
 * Entspricht exakt der Struktur, die der Importer erwartet.
 */
export const generateElectionTemplate = async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'HKA E-Voting System';

  // --- BLATT 1: WAHLEN (Konfiguration) ---
  const sheet = workbook.addWorksheet('Wahlen', {
    views: [{ showGridLines: false }],
  });

  // Spaltenbreiten definieren
  sheet.columns = [
    { width: 20 }, // A: Kennung
    { width: 40 }, // B: Info
    { width: 15 }, // C: Listen
    { width: 20 }, // D: Zeitraum / Plätze
    { width: 15 }, // E: Stimmen pro Zettel
    { width: 15 }, // F: Max Kum
    { width: 30 }, // G: Wahltyp
    { width: 30 }, // H: Zählverfahren
  ];

  // --- HEADER ---
  sheet.mergeCells('A1:H2');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'Gremienwahlen - Konfiguration';
  titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HKA_RED } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // --- META-INFO BLOCK (Zeilen 3-4) ---
  const d3 = sheet.getCell('D3');
  d3.value = 'Wahlzeitraum von:';
  d3.font = { bold: true };
  const e3 = sheet.getCell('E3');
  e3.value = '01.01.2025'; // Beispiel

  const d4 = sheet.getCell('D4');
  d4.value = 'bis:';
  d4.font = { bold: true };
  const e4 = sheet.getCell('E4');
  e4.value = '31.01.2025'; // Beispiel

  // --- TABELLEN-HEADER (Zeile 7) ---
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

  // --- BEISPIEL-ZEILE (Zeile 8) ---
  const row = sheet.getRow(8);
  row.values = ['senat_25', 'Senatswahl WiSe 2025', 1, 7, 7, 3, 'Verhältniswahl', 'Sainte-Laguë'];

  // Dropdowns für Validierung (G und H)
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

  // --- BLATT 2: KANDIDATEN (Listenvorlage) ---
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

  // Header Kandidaten (Zeile 1)
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
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; // Weißer Text
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HKA_BLACK } }; // Schwarzer Hintergrund
  });

  // Beispiel
  candSheet.getRow(2).values = [
    'senat_25',
    '123456',
    'IWI',
    'Mustermann',
    'Max',
    'Liste 1',
    '',
    'ja',
  ];

  logger.info('Wahl-Template erfolgreich generiert');
  return workbook;
};
